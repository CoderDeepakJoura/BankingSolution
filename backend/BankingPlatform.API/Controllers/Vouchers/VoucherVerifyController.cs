using BankingPlatform.Infrastructure.DbContexts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers.Vouchers
{
    public record UnverifiedVoucherDTO(
        int VoucherId, int VoucherNo, DateTime VoucherDate,
        int VoucherType, int VoucherSubType,
        string? Narration, int? AddedBy, string AddedByName,
        decimal Amount
    );

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VoucherVerifyController : ControllerBase
    {
        private readonly BankingDbContext _db;

        public VoucherVerifyController(BankingDbContext db) => _db = db;

        // GET api/VoucherVerify/{branchId}?date=2026-09-24
        [HttpGet("{branchId}")]
        public async Task<IActionResult> GetUnverified([FromRoute] int branchId, [FromQuery] DateTime date)
        {
            try
            {
                var vouchers = await _db.voucher.AsNoTracking()
                    .Where(v => v.BrID == branchId
                             && v.VoucherStatus == "A"
                             && v.VoucherDate.Date == date.Date)
                    .OrderBy(v => v.VoucherNo)
                    .ToListAsync();

                var ids = vouchers.Select(v => v.Id).ToList();

                var amounts = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(d => ids.Contains(d.VoucherID) && d.BrId == branchId && d.VoucherEntryType == "Dr")
                    .GroupBy(d => d.VoucherID)
                    .Select(g => new { VoucherId = g.Key, Total = g.Sum(d => d.VoucherAmount) })
                    .ToDictionaryAsync(x => x.VoucherId, x => x.Total);

                var userIds = vouchers
                    .Where(v => v.AddedBy.HasValue)
                    .Select(v => v.AddedBy!.Value)
                    .Distinct()
                    .ToList();

                var userNames = await _db.user.AsNoTracking()
                    .Where(u => userIds.Contains(u.id))
                    .Select(u => new { u.id, u.username })
                    .ToDictionaryAsync(u => u.id, u => u.username ?? "");

                var result = vouchers.Select(v => new UnverifiedVoucherDTO(
                    v.Id, v.VoucherNo, v.VoucherDate,
                    v.VoucherType, v.VoucherSubType,
                    v.VoucherNarration,
                    v.AddedBy,
                    v.AddedBy.HasValue && userNames.TryGetValue(v.AddedBy.Value, out var n) ? n : "—",
                    amounts.TryGetValue(v.Id, out var a) ? a : 0m
                )).ToList();

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST api/VoucherVerify/{branchId}/{voucherId}
        [HttpPost("{branchId}/{voucherId}")]
        public async Task<IActionResult> VerifyVoucher([FromRoute] int branchId, [FromRoute] int voucherId)
        {
            try
            {
                var userIdClaim = User.FindFirst("userId")?.Value
                               ?? User.FindFirst("UserId")?.Value
                               ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (!int.TryParse(userIdClaim, out int currentUserId))
                    return Unauthorized(new { success = false, message = "Invalid session." });

                var voucher = await _db.voucher
                    .FirstOrDefaultAsync(v => v.Id == voucherId && v.BrID == branchId);

                if (voucher == null)
                    return NotFound(new { success = false, message = "Voucher not found." });

                if (voucher.VoucherStatus == "V")
                    return BadRequest(new { success = false, message = "Voucher is already verified." });

                if (voucher.AddedBy.HasValue && voucher.AddedBy.Value == currentUserId)
                    return BadRequest(new { success = false, message = "You cannot verify your own voucher." });

                voucher.VoucherStatus = "V";
                voucher.VerifiedBy = currentUserId;
                await _db.SaveChangesAsync();

                return Ok(new { success = true, message = $"Voucher no. {voucher.VoucherNo} verified successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
