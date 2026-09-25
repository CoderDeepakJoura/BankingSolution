using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.Service.Vouchers;
using BankingPlatform.Infrastructure.DbContexts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers.Vouchers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class VoucherOperationsController : ControllerBase
    {
        private readonly VoucherOperationsService _service;
        private readonly ILogger<VoucherOperationsController> _logger;
        private readonly CommonFunctions _commonFunctions;
        private readonly BankingDbContext _db;

        public VoucherOperationsController(VoucherOperationsService service, ILogger<VoucherOperationsController> logger, CommonFunctions commonFunctions, BankingDbContext db)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
            _db = db;
        }

        [HttpGet("preview/{branchId}/{voucherDate}/{voucherNo}")]
        public async Task<IActionResult> Preview([FromRoute] int branchId, DateTime voucherDate, int voucherNo)
        {
            var (success, message, data) = await _service.GetPreviewAsync(branchId, voucherNo, voucherDate);
            if (!success) return BadRequest(new ResponseDto { Success = false, Message = message });
            return Ok(new { Success = true, data });
        }

        [HttpDelete("{branchId}/{voucherDate}/{voucherNo}")]
        public async Task<IActionResult> Delete([FromRoute] int branchId, DateTime voucherDate, int voucherNo)
        {
            try
            {
                var (success, message) = await _service.DeleteVoucherAsync(branchId, voucherNo, voucherDate);
                if (!success) return BadRequest(new ResponseDto { Success = false, Message = message });
                return Ok(new ResponseDto { Success = true, Message = message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting voucher {VoucherNo}", voucherNo);
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(VoucherOperationsController));
                return BadRequest(new ResponseDto { Success = false, Message = "An error occurred while deleting the voucher." });
            }
        }

        // GET api/VoucherOperations/unverified/{branchId}?date=2026-09-25
        [HttpGet("unverified/{branchId}")]
        public async Task<IActionResult> GetUnverified([FromRoute] int branchId, [FromQuery] DateTime date)
        {
            try
            {
                var vouchers = await _db.voucher.AsNoTracking()
                    .Where(v => v.BrID == branchId && v.VoucherStatus == "A" && v.VoucherDate.Date == date.Date)
                    .OrderBy(v => v.VoucherNo)
                    .ToListAsync();

                var ids = vouchers.Select(v => v.Id).ToList();

                var amounts = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(d => ids.Contains(d.VoucherID) && d.BrId == branchId && d.VoucherEntryType == "Dr")
                    .GroupBy(d => d.VoucherID)
                    .Select(g => new { VoucherId = g.Key, Total = g.Sum(d => d.VoucherAmount) })
                    .ToDictionaryAsync(x => x.VoucherId, x => x.Total);

                var userIds = vouchers.Where(v => v.AddedBy.HasValue).Select(v => v.AddedBy!.Value).Distinct().ToList();
                var userNames = await _db.user.AsNoTracking()
                    .Where(u => userIds.Contains(u.id))
                    .Select(u => new { u.id, u.username })
                    .ToDictionaryAsync(u => u.id, u => u.username ?? "");

                var result = vouchers.Select(v => new
                {
                    voucherId      = v.Id,
                    voucherNo      = v.VoucherNo,
                    voucherDate    = v.VoucherDate,
                    voucherType    = v.VoucherType,
                    voucherSubType = v.VoucherSubType,
                    narration      = v.VoucherNarration,
                    addedBy        = v.AddedBy,
                    addedByName    = v.AddedBy.HasValue && userNames.ContainsKey(v.AddedBy.Value) ? userNames[v.AddedBy.Value] : "—",
                    amount         = amounts.ContainsKey(v.Id) ? amounts[v.Id] : 0m
                }).ToList();

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST api/VoucherOperations/verify/{branchId}/{voucherId}
        [HttpPost("verify/{branchId}/{voucherId}")]
        public async Task<IActionResult> VerifyVoucher([FromRoute] int branchId, [FromRoute] int voucherId)
        {
            try
            {
                var userIdClaim = User.FindFirst("userId")?.Value
                               ?? User.FindFirst("UserId")?.Value
                               ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (!int.TryParse(userIdClaim, out int currentUserId))
                    return Unauthorized(new { success = false, message = "Invalid session." });

                var voucher = await _db.voucher.FirstOrDefaultAsync(v => v.Id == voucherId && v.BrID == branchId);
                if (voucher == null)
                    return NotFound(new { success = false, message = "Voucher not found." });
                if (voucher.VoucherStatus == "V")
                    return BadRequest(new { success = false, message = "Voucher is already verified." });
                if (voucher.AddedBy.HasValue && voucher.AddedBy.Value == currentUserId)
                    return BadRequest(new { success = false, message = "You cannot verify your own voucher." });

                voucher.VoucherStatus = "V";
                voucher.VerifiedBy = currentUserId;

                // Propagate status to all detail tables
                var vid = voucher.Id;

                var creditDebitRows = await _db.vouchercreditdebitdetails.Where(x => x.VoucherID == vid && x.BrId == branchId).ToListAsync();
                foreach (var r in creditDebitRows) r.VoucherStatus = "V";

                var savingRows = await _db.vouchersavingdetail.Where(x => x.VoucherId == vid).ToListAsync();
                foreach (var r in savingRows) r.VoucherMainStatus = "V";

                var recintRows = await _db.voucherrecintdetail.Where(x => x.VoucherId == vid).ToListAsync();
                foreach (var r in recintRows) r.VoucherMainStatus = "V";

                var rdRows = await _db.voucherrddetail.Where(x => x.VoucherId == vid).ToListAsync();
                foreach (var r in rdRows) r.VoucherMainStatus = "V";

                var fdRows = await _db.voucherfddetail.Where(x => x.VoucherId == vid && x.BrId == branchId).ToListAsync();
                foreach (var r in fdRows) r.VoucherMainStatus = "V";

                var bfdRows = await _db.voucherbfddetail.Where(x => x.VoucherId == vid && x.BrId == branchId).ToListAsync();
                foreach (var r in bfdRows) r.VoucherMainStatus = "V";

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
