using BankingPlatform.API.Common;
using BankingPlatform.API.Service.AutoDebit;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.AutoDebit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers.AutoDebit
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AutoDebitController : ControllerBase
    {
        private readonly BankingDbContext _db;
        private readonly AutoDebitService _autoDebitService;

        public AutoDebitController(BankingDbContext db, AutoDebitService autoDebitService)
        {
            _db = db;
            _autoDebitService = autoDebitService;
        }

        // ── Mandates ─────────────────────────────────────────────────────────────

        [HttpGet("mandates/{branchId}")]
        public async Task<IActionResult> GetMandates([FromRoute] int branchId)
        {
            if (!ClaimsHelper.BranchMatches(User, branchId)) return Forbid();

            var mandates = await _db.autodebitaccount
                .Where(x => x.branchid == branchId)
                .OrderByDescending(x => x.id)
                .ToListAsync();

            // Enrich with account names
            var accIds = mandates.Select(x => x.accountid).Distinct().ToList();
            var savAccIds = mandates.Where(x => x.savingaccountid.HasValue).Select(x => x.savingaccountid!.Value).Distinct().ToList();
            var allAccIds = accIds.Union(savAccIds).Distinct().ToList();
            var accNames = await _db.accountmaster
                .Where(x => x.BranchId == branchId && allAccIds.Contains(x.ID))
                .Select(x => new { x.ID, x.AccountName, x.AccountNumber, x.AccPrefix, x.AccSuffix })
                .ToDictionaryAsync(x => x.ID);

            var result = mandates.Select(m => new
            {
                m.id, m.branchid, m.accountid, m.accounttype, m.isactive, m.notes, m.savingaccountid,
                createdAt       = m.createdAt.ToString("dd-MMM-yyyy"),
                accountName     = accNames.TryGetValue(m.accountid, out var a) ? a.AccountName : "",
                accountNo       = accNames.TryGetValue(m.accountid, out var b)
                                  ? (!string.IsNullOrWhiteSpace(b.AccountNumber)
                                     ? b.AccountNumber
                                     : $"{b.AccPrefix}-{b.AccSuffix}")
                                  : "",
                savingAccName   = m.savingaccountid.HasValue && accNames.TryGetValue(m.savingaccountid.Value, out var c) ? c.AccountName : "",
                savingAccNo     = m.savingaccountid.HasValue && accNames.TryGetValue(m.savingaccountid.Value, out var d)
                                  ? (!string.IsNullOrWhiteSpace(d.AccountNumber) ? d.AccountNumber : $"{d.AccPrefix}-{d.AccSuffix}")
                                  : "",
            });

            return Ok(new { success = true, data = result });
        }

        [HttpPost("mandates")]
        public async Task<IActionResult> AddMandate([FromBody] AddMandateDTO dto)
        {
            if (!ClaimsHelper.BranchMatches(User, dto.BranchId)) return Forbid();

            // Prevent duplicate mandate
            bool exists = await _db.autodebitaccount
                .AnyAsync(x => x.branchid == dto.BranchId && x.accountid == dto.AccountId && x.accounttype == dto.AccountType);
            if (exists)
                return BadRequest(new { success = false, message = "Mandate already exists for this account." });

            var mandate = new AutoDebitAccount
            {
                branchid        = dto.BranchId,
                accountid       = dto.AccountId,
                accounttype     = dto.AccountType,
                isactive        = true,
                createdAt       = DateTime.Now,
                notes           = dto.Notes,
                savingaccountid = dto.SavingAccountId > 0 ? dto.SavingAccountId : null,
            };
            await _db.autodebitaccount.AddAsync(mandate);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Mandate added.", data = new { mandate.id } });
        }

        [HttpPatch("mandates/{id}/toggle")]
        public async Task<IActionResult> ToggleMandate([FromRoute] int id, [FromQuery] int branchId)
        {
            if (!ClaimsHelper.BranchMatches(User, branchId)) return Forbid();

            var mandate = await _db.autodebitaccount.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (mandate == null) return NotFound();

            mandate.isactive = !mandate.isactive;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, isActive = mandate.isactive });
        }

        [HttpDelete("mandates/{id}")]
        public async Task<IActionResult> DeleteMandate([FromRoute] int id, [FromQuery] int branchId)
        {
            if (!ClaimsHelper.BranchMatches(User, branchId)) return Forbid();

            var mandate = await _db.autodebitaccount.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (mandate == null) return NotFound();

            _db.autodebitaccount.Remove(mandate);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Mandate removed." });
        }

        // ── Run History ──────────────────────────────────────────────────────────

        [HttpGet("history/{branchId}")]
        public async Task<IActionResult> GetHistory([FromRoute] int branchId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (!ClaimsHelper.BranchMatches(User, branchId)) return Forbid();

            var query = _db.autodebitrun.Where(x => x.branchid == branchId).OrderByDescending(x => x.id);
            int total = await query.CountAsync();
            var runs = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return Ok(new
            {
                success = true,
                data = runs.Select(r => new
                {
                    r.id, r.branchid, r.totalAccounts, r.successCount, r.failCount, r.status,
                    runDate   = r.runDate.ToString("dd-MMM-yyyy"),
                    startTime = r.startTime.ToString("HH:mm:ss"),
                    endTime   = r.endTime?.ToString("HH:mm:ss") ?? "",
                }),
                total, page, pageSize
            });
        }

        [HttpGet("history/{branchId}/run/{runId}")]
        public async Task<IActionResult> GetRunDetails([FromRoute] int branchId, [FromRoute] int runId)
        {
            if (!ClaimsHelper.BranchMatches(User, branchId)) return Forbid();

            var run = await _db.autodebitrun.FirstOrDefaultAsync(x => x.id == runId && x.branchid == branchId);
            if (run == null) return NotFound();

            var details = await _db.autodebitrundetail.Where(x => x.runId == runId).ToListAsync();

            // Resolve display voucher numbers (VoucherNo) from the voucher table
            var voucherDbIds = details.Where(d => d.voucherId.HasValue).Select(d => d.voucherId!.Value).Distinct().ToList();
            var voucherNoMap = await _db.voucher
                .Where(v => voucherDbIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id, v => v.VoucherNo);

            return Ok(new
            {
                success = true,
                run = new
                {
                    run.id, run.branchid, run.totalAccounts, run.successCount, run.failCount, run.status,
                    runDate   = run.runDate.ToString("dd-MMM-yyyy"),
                    startTime = run.startTime.ToString("HH:mm:ss"),
                    endTime   = run.endTime?.ToString("HH:mm:ss") ?? "",
                },
                details = details.Select(d => new
                {
                    d.id, d.accountid, d.accountType, d.accountNo, d.accountName,
                    d.amount, d.status, d.errorMessage, d.voucherId,
                    voucherNo = d.voucherId.HasValue && voucherNoMap.TryGetValue(d.voucherId.Value, out var vno) ? vno : (int?)null,
                })
            });
        }

        // ── Manual trigger (SU only) ─────────────────────────────────────────────
        // POST /api/AutoDebit/run-now/{branchId}
        // Bypasses scheduled time and duplicate-run checks — for testing only.

        [HttpPost("run-now/{branchId}")]
        public async Task<IActionResult> RunNow([FromRoute] int branchId)
        {
            if (!ClaimsHelper.GetIsSu(User)) return Forbid();

            try
            {
                await _autoDebitService.RunBranchNowAsync(branchId);
                return Ok(new { success = true, message = $"Auto-debit batch completed for branch {branchId}." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }

    public class AddMandateDTO
    {
        public int BranchId { get; set; }
        public int AccountId { get; set; }
        public string AccountType { get; set; } = ""; // "RDKist" | "LoanRecovery"
        public string? Notes { get; set; }
        public int SavingAccountId { get; set; }
    }
}
