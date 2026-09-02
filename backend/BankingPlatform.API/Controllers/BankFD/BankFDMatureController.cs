using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.BankFD;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BankingPlatform.API.Controllers.BankFD
{
    // ──────────────────────────── DTOs ────────────────────────────

    public class BankFDMatureRequestDTO
    {
        public int BranchId { get; set; }
        public int AccId { get; set; }
        public int DetailId { get; set; }
        public DateTime VoucherDate { get; set; }
        public int PayoutAccId { get; set; }        // Dr: cash/bank received
        public int IntIncomeAccId { get; set; }     // Cr: interest income GL
        public decimal TDSAmount { get; set; }      // 0 if no TDS
        public int? TDSAccId { get; set; }          // null if no TDS
        public string Narration { get; set; } = "";
        public bool IsRenew { get; set; }
        // Renew-only
        public int RenewMonths { get; set; }
        public int RenewDays { get; set; }
        public decimal RenewMaturityAmount { get; set; }
        // Optional: operator-overridden maturity amount (principal + edited interest)
        public decimal? OverrideMaturityAmount { get; set; }
    }

    public class SaveInterestIncomeSettingDTO
    {
        public long HeadCode { get; set; }
        public int IntIncomeAccId { get; set; }
    }

    public class BankFDPreMatureRequestDTO
    {
        public int BranchId { get; set; }
        public int AccId { get; set; }
        public int DetailId { get; set; }
        public DateTime VoucherDate { get; set; }
        public int PayoutAccId { get; set; }
        public int IntIncomeAccId { get; set; }
        public decimal TDSAmount { get; set; }
        public int? TDSAccId { get; set; }
        public string Narration { get; set; } = "";
        public double PenaltyRate { get; set; } = 1.0;
        public double EffectiveRate { get; set; }
        public decimal PreMatureAmount { get; set; }
    }

    // ──────────────────────────── Controller ────────────────────────────

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BankFDMatureController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly ILogger<BankFDMatureController> _logger;
        private readonly CommonFunctions _commonFunctions;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public BankFDMatureController(
            BankingDbContext context,
            ILogger<BankFDMatureController> logger,
            CommonFunctions commonFunctions,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _logger = logger;
            _commonFunctions = commonFunctions;
            _httpContextAccessor = httpContextAccessor;
        }

        // ── GET /{branchId}/accounts?voucherDate=YYYY-MM-DD
        // Returns Bank FD accounts that have at least one genuinely matured active detail.
        [HttpGet("{branchId}/accounts")]
        public async Task<IActionResult> GetMaturedAccounts(int branchId, [FromQuery] string? voucherDate = null)
        {
            try
            {
                var cutoff = voucherDate != null && DateTime.TryParse(voucherDate, out var d)
                    ? d.Date
                    : DateTime.Today;

                var detailAccIds = await _context.bankfdaccountdetail
                    .AsNoTracking()
                    .Where(d => d.BrId == branchId
                             && d.FDStatus == 1
                             && d.FDMaturityDate.Date <= cutoff)
                    .Select(d => d.AccId)
                    .Distinct()
                    .ToListAsync();

                if (!detailAccIds.Any())
                    return Ok(new { Success = true, data = Array.Empty<object>() });

                var accounts = await _context.accountmaster
                    .AsNoTracking()
                    .Where(a => a.BranchId == branchId && a.AccTypeId == 8 && detailAccIds.Contains(a.ID))
                    .Select(a => new { accId = a.ID, accountName = a.AccountName, accNo = $"{a.AccPrefix ?? "BFD"}-{a.AccSuffix}" })
                    .ToListAsync();

                return Ok(new { Success = true, data = accounts });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMaturedAccounts error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── GET /{branchId}/all-accounts
        // Returns all Bank FD accounts that have at least one active detail (for pre-mature).
        [HttpGet("{branchId}/all-accounts")]
        public async Task<IActionResult> GetAllActiveAccounts(int branchId)
        {
            try
            {
                var detailAccIds = await _context.bankfdaccountdetail
                    .AsNoTracking()
                    .Where(d => d.BrId == branchId && d.FDStatus == 1)
                    .Select(d => d.AccId)
                    .Distinct()
                    .ToListAsync();

                if (!detailAccIds.Any())
                    return Ok(new { Success = true, data = Array.Empty<object>() });

                var accounts = await _context.accountmaster
                    .AsNoTracking()
                    .Where(a => a.BranchId == branchId && a.AccTypeId == 8 && detailAccIds.Contains(a.ID))
                    .Select(a => new { accId = a.ID, accountName = a.AccountName, accNo = $"{a.AccPrefix ?? "BFD"}-{a.AccSuffix}" })
                    .ToListAsync();

                return Ok(new { Success = true, data = accounts });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAllActiveAccounts error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── GET /{branchId}/account/{accId}/details?voucherDate=YYYY-MM-DD&premature=false
        // Returns eligible details + TDS info for an account.
        [HttpGet("{branchId}/account/{accId}/details")]
        public async Task<IActionResult> GetAccountDetails(int branchId, int accId,
            [FromQuery] string? voucherDate = null,
            [FromQuery] bool premature = false)
        {
            try
            {
                var cutoff = voucherDate != null && DateTime.TryParse(voucherDate, out var d)
                    ? d.Date
                    : DateTime.Today;

                var account = await _context.accountmaster
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.ID == accId && a.BranchId == branchId && a.AccTypeId == 8);

                if (account == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Account not found." });

                IQueryable<BankFDAccountDetail> detailQuery = _context.bankfdaccountdetail
                    .AsNoTracking()
                    .Where(d => d.AccId == accId && d.BrId == branchId && d.FDStatus == 1);

                if (!premature)
                    detailQuery = detailQuery.Where(d => d.FDMaturityDate.Date <= cutoff);

                var details = await detailQuery.ToListAsync();

                // TDS: slab for this branch + setting for this account head
                var tdsSlabs = await _context.fdtdsslab
                    .AsNoTracking()
                    .Where(s => s.BrId == branchId)
                    .ToListAsync();

                var tdsSlabDetails = await _context.fdtdsslabdetail
                    .AsNoTracking()
                    .Where(sd => sd.BrId == branchId)
                    .ToListAsync();

                var tdsSetting = await _context.bfdheadtdsaccsettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.BrId == branchId && t.HeadCode == account.HeadCode);

                var intIncomeSetting = await _context.bankfdinterestincomesetting
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.BrId == branchId && s.HeadCode == account.HeadCode);

                var data = new
                {
                    account = new
                    {
                        accId = account.ID,
                        accountName = account.AccountName,
                        accNo = $"{account.AccPrefix ?? "BFD"}-{account.AccSuffix}",
                        headCode = account.HeadCode
                    },
                    details = details.Select(d => new
                    {
                        id = d.ID,
                        ltdNo = d.LTDNo,
                        fdDate = d.FDDate,
                        fdAmount = d.FDAmount,
                        fdPeriodMonths = d.FDPeriodMonths,
                        fdPeriodDays = d.FDPeriodDays,
                        intRate = d.IntRate,
                        intCompInterval = d.IntCompInterval,
                        fdMaturityDate = d.FDMaturityDate,
                        maturityAmount = d.MaturityAmount,
                        fdStatus = d.FDStatus,
                        tdsAmount = d.TdsAmount
                    }),
                    tdsSlabs = tdsSlabs.Select(s => new
                    {
                        id = s.ID,
                        name = s.Name,
                        type = s.Type,
                        withPanCard = s.WithPanCard,
                        details = tdsSlabDetails.Where(sd => sd.SlabID == s.ID).Select(sd => new
                        {
                            fromAmount = sd.FromAmount,
                            toAmount = sd.ToAmount,
                            intRate = sd.IntRate
                        })
                    }),
                    tdsSetting = tdsSetting == null ? null : new
                    {
                        tdsAccId = tdsSetting.TDSAccId
                    },
                    intIncomeSetting = intIncomeSetting == null ? null : new
                    {
                        intIncomeAccId = intIncomeSetting.IntIncomeAccId
                    }
                };

                return Ok(new { Success = true, data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAccountDetails error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── POST /mature
        [HttpPost("mature")]
        public async Task<IActionResult> MatureFD([FromBody] BankFDMatureRequestDTO dto)
        {
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var (voucherNo, msg) = await ProcessBankFDClosure(
                    dto.BranchId, dto.AccId, dto.DetailId,
                    dto.VoucherDate, dto.PayoutAccId, dto.IntIncomeAccId,
                    dto.TDSAmount, dto.TDSAccId, dto.Narration,
                    dto.IsRenew, dto.RenewMonths, dto.RenewDays, dto.RenewMaturityAmount,
                    isPremature: false, penaltyRate: 0, effectiveRate: 0, preMatureAmount: 0,
                    overrideMaturityAmount: dto.OverrideMaturityAmount);

                if (msg != null) return BadRequest(new ResponseDto { Success = false, Message = msg });

                await tx.CommitAsync();
                var action = dto.IsRenew ? "renewed" : "matured";
                return Ok(new ResponseDto { Success = true, Message = $"Voucher saved successfully with voucher no. {voucherNo}" });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "MatureFD error");
                await _commonFunctions.LogErrors(ex, nameof(MatureFD), nameof(BankFDMatureController));
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── POST /premature
        [HttpPost("premature")]
        public async Task<IActionResult> PreMatureFD([FromBody] BankFDPreMatureRequestDTO dto)
        {
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var (voucherNo, msg) = await ProcessBankFDClosure(
                    dto.BranchId, dto.AccId, dto.DetailId,
                    dto.VoucherDate, dto.PayoutAccId, dto.IntIncomeAccId,
                    dto.TDSAmount, dto.TDSAccId, dto.Narration,
                    isRenew: false, renewMonths: 0, renewDays: 0, renewMaturityAmount: 0,
                    isPremature: true, dto.PenaltyRate, dto.EffectiveRate, dto.PreMatureAmount);

                if (msg != null) return BadRequest(new ResponseDto { Success = false, Message = msg });

                await tx.CommitAsync();
                return Ok(new ResponseDto { Success = true, Message = $"Voucher saved successfully with voucher no. {voucherNo}" });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "PreMatureFD error");
                await _commonFunctions.LogErrors(ex, nameof(PreMatureFD), nameof(BankFDMatureController));
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── GET /{branchId}/interest-income-setting-by-headid/{headId}
        [HttpGet("{branchId}/interest-income-setting-by-headid/{headId}")]
        public async Task<IActionResult> GetInterestIncomeSettingByHeadId(int branchId, int headId)
        {
            if (headId <= 0)
                return Ok(new { Success = true, data = new { intIncomeAccId = (int?)null } });

            var headCode = await _context.accounthead
                .Where(x => x.id == headId && x.branchid == branchId)
                .Select(x => x.headcode)
                .FirstOrDefaultAsync();

            var setting = headCode > 0
                ? await _context.bankfdinterestincomesetting
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.BrId == branchId && s.HeadCode == headCode)
                : null;

            return Ok(new { Success = true, data = new { intIncomeAccId = setting?.IntIncomeAccId } });
        }

        // ── GET /{branchId}/interest-income-settings — all settings for this branch
        [HttpGet("{branchId}/interest-income-settings")]
        public async Task<IActionResult> GetInterestIncomeSettings(int branchId)
        {
            var settings = await _context.bankfdinterestincomesetting
                .AsNoTracking()
                .Where(s => s.BrId == branchId)
                .Select(s => new { id = s.ID, headCode = s.HeadCode, intIncomeAccId = s.IntIncomeAccId })
                .ToListAsync();
            return Ok(new { Success = true, data = settings });
        }

        // ── POST /{branchId}/interest-income-settings — create setting
        [HttpPost("{branchId}/interest-income-settings")]
        public async Task<IActionResult> CreateInterestIncomeSetting(int branchId, [FromBody] SaveInterestIncomeSettingDTO dto)
        {
            try
            {
                if (await _context.bankfdinterestincomesetting.AnyAsync(s => s.BrId == branchId && s.HeadCode == dto.HeadCode))
                    return BadRequest(new ResponseDto { Success = false, Message = "A setting for this account head already exists." });
                _context.bankfdinterestincomesetting.Add(new BankFDInterestIncomeSetting
                {
                    BrId = branchId, HeadCode = dto.HeadCode, IntIncomeAccId = dto.IntIncomeAccId
                });
                await _context.SaveChangesAsync();
                return Ok(new ResponseDto { Success = true, Message = "Setting saved." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateInterestIncomeSetting error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── PUT /{branchId}/interest-income-settings/{id} — update setting
        [HttpPut("{branchId}/interest-income-settings/{id}")]
        public async Task<IActionResult> UpdateInterestIncomeSetting(int branchId, int id, [FromBody] SaveInterestIncomeSettingDTO dto)
        {
            try
            {
                var setting = await _context.bankfdinterestincomesetting.FirstOrDefaultAsync(s => s.ID == id && s.BrId == branchId);
                if (setting == null) return NotFound(new ResponseDto { Success = false, Message = "Setting not found." });
                setting.HeadCode = dto.HeadCode;
                setting.IntIncomeAccId = dto.IntIncomeAccId;
                await _context.SaveChangesAsync();
                return Ok(new ResponseDto { Success = true, Message = "Setting updated." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateInterestIncomeSetting error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── DELETE /{branchId}/interest-income-settings/{id}
        [HttpDelete("{branchId}/interest-income-settings/{id}")]
        public async Task<IActionResult> DeleteInterestIncomeSetting(int branchId, int id)
        {
            try
            {
                var setting = await _context.bankfdinterestincomesetting.FirstOrDefaultAsync(s => s.ID == id && s.BrId == branchId);
                if (setting == null) return NotFound(new ResponseDto { Success = false, Message = "Setting not found." });
                _context.bankfdinterestincomesetting.Remove(setting);
                await _context.SaveChangesAsync();
                return Ok(new ResponseDto { Success = true, Message = "Setting deleted." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeleteInterestIncomeSetting error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── Core closure logic shared by mature and pre-mature ──────────────

        private async Task<(int voucherNo, string? errorMsg)> ProcessBankFDClosure(
            int branchId, int accId, int detailId,
            DateTime voucherDate, int payoutAccId, int intIncomeAccId,
            decimal tdsAmount, int? tdsAccId,
            string narration,
            bool isRenew, int renewMonths, int renewDays, decimal renewMaturityAmount,
            bool isPremature, double penaltyRate, double effectiveRate, decimal preMatureAmount,
            decimal? overrideMaturityAmount = null)
        {
            var detail = await _context.bankfdaccountdetail
                .FirstOrDefaultAsync(d => d.ID == detailId && d.BrId == branchId && d.AccId == accId);

            if (detail == null) return (0, "FD detail not found.");
            if (detail.FDStatus != 1) return (0, "This FD detail is already closed.");

            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var userIdStr = claimsPrincipal?.FindFirst("userId")?.Value
                         ?? claimsPrincipal?.FindFirst("UserId")?.Value
                         ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int userId = int.TryParse(userIdStr, out var uid) ? uid : 0;

            bool autoVerify = await _commonFunctions.IsAutoVerification(branchId);
            string voucherStatus = autoVerify ? "V" : "A";
            int voucherNo = await _commonFunctions.GetLatestVoucherNo(branchId, voucherDate);
            DateTime vDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified);

            decimal principal = detail.FDAmount;
            decimal closureAmount = isPremature ? preMatureAmount
                : (isRenew ? renewMaturityAmount
                : (overrideMaturityAmount ?? detail.MaturityAmount));
            decimal interest = Math.Max(0, closureAmount - principal);

            string defaultNarration = isPremature
                ? $"Bank FD Pre-Matured — LTD {detail.LTDNo} — Principal ₹{principal:N2} — Interest ₹{interest:N2}"
                : isRenew
                    ? $"Bank FD Renewed — LTD {detail.LTDNo} — Principal ₹{principal:N2} — Interest ₹{interest:N2}"
                    : $"Bank FD Matured — LTD {detail.LTDNo} — Principal ₹{principal:N2} — Interest ₹{interest:N2}";
            string finalNarration = string.IsNullOrWhiteSpace(narration) ? defaultNarration : narration;

            int subType = isPremature ? 7 : (isRenew ? 6 : 5);

            // Create voucher header
            var voucher = new Voucher
            {
                BrID = branchId,
                VoucherNo = voucherNo,
                VoucherType = (int)Enums.VoucherType.BankFD,
                VoucherSubType = subType,
                VoucherDate = vDate,
                ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                VoucherNarration = finalNarration,
                VoucherStatus = voucherStatus,
                AddedBy = userId,
                ModifiedBy = 0,
                VerifiedBy = autoVerify ? userId : 0,
                OtherBrID = 0
            };
            await _context.voucher.AddAsync(voucher);
            await _context.SaveChangesAsync();

            int row = 1;
            long bfdHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(accId, branchId);

            // ── Voucher entries ──────────────────────────────────────────────────────
            // Dr: Payout Account (net received = closureAmount - tds)
            decimal netPayout = closureAmount - tdsAmount;
            VoucherCreditDebitDetails vcrPayout = null!;
            if (!isRenew && payoutAccId > 0 && netPayout > 0)
            {
                long payoutHead = await _commonFunctions.GetAccountHeadCodeFromAccId(payoutAccId, branchId);
                vcrPayout = MakeEntry(payoutHead, payoutAccId, branchId, "Dr", finalNarration, netPayout, voucherStatus, vDate, voucher.Id, row++);
                _context.vouchercreditdebitdetails.Add(vcrPayout);
            }

            // Dr: TDS Account (if TDS applies and tdsAccId is set)
            if (tdsAmount > 0 && tdsAccId.HasValue && tdsAccId.Value > 0)
            {
                long tdsHead = await _commonFunctions.GetAccountHeadCodeFromAccId(tdsAccId.Value, branchId);
                _context.vouchercreditdebitdetails.Add(
                    MakeEntry(tdsHead, tdsAccId.Value, branchId, "Dr", "TDS Deducted at Source", tdsAmount, voucherStatus, vDate, voucher.Id, row++));
            }

            // Cr: BFD Account (principal — closing the FD)
            VoucherCreditDebitDetails vcrBfd = MakeEntry(bfdHeadCode, accId, branchId, "Cr", finalNarration, principal, voucherStatus, vDate, voucher.Id, row++);
            _context.vouchercreditdebitdetails.Add(vcrBfd);

            // Cr: Interest Income Account (interest earned)
            if (interest > 0 && intIncomeAccId > 0)
            {
                long intHead = await _commonFunctions.GetAccountHeadCodeFromAccId(intIncomeAccId, branchId);
                _context.vouchercreditdebitdetails.Add(
                    MakeEntry(intHead, intIncomeAccId, branchId, "Cr", "Interest Income — Bank FD", interest, voucherStatus, vDate, voucher.Id, row++));
            }

            // If renew: Dr New BFD detail (new FD with closureAmount - tds as new principal)
            BankFDAccountDetail? newDetail = null;
            VoucherCreditDebitDetails? vcrNewBfd = null;
            if (isRenew)
            {
                decimal newPrincipal = closureAmount - tdsAmount;
                var matDate = CalcMaturityDate(vDate, renewMonths, renewDays);
                newDetail = new BankFDAccountDetail
                {
                    BrId = branchId,
                    AccId = accId,
                    LTDNo = detail.LTDNo + "R",
                    FDDate = vDate,
                    FDAmount = newPrincipal,
                    FDPeriodMonths = renewMonths,
                    FDPeriodDays = renewDays,
                    IntRate = detail.IntRate,
                    IntCompInterval = detail.IntCompInterval,
                    FDMaturityDate = matDate,
                    MaturityAmount = renewMaturityAmount,
                    FDStatus = 1,
                    TdsAmount = 0
                };
                await _context.bankfdaccountdetail.AddAsync(newDetail);
                await _context.SaveChangesAsync();

                vcrNewBfd = MakeEntry(bfdHeadCode, accId, branchId, "Dr", $"Bank FD Renewed — new period {renewMonths}m {renewDays}d", newPrincipal, voucherStatus, vDate, voucher.Id, row++);
                _context.vouchercreditdebitdetails.Add(vcrNewBfd);
            }

            await _context.SaveChangesAsync();

            // VoucherBFDDetail — closure row (Cr old detail)
            string operation = isPremature ? "BP" : (isRenew ? "BR" : "BM");
            await _context.voucherbfddetail.AddAsync(new VoucherBFDDetail
            {
                BrId = branchId,
                VoucherId = voucher.Id,
                VAccCrDrId = vcrBfd.Id,
                FDAccId = accId,
                FDAccDetId = detail.ID,
                AmountCr = principal,
                AmountDr = 0,
                Operation = operation,
                ValueDate = vDate,
                VoucherDate = vDate,
                VoucherMainStatus = voucherStatus
            });

            // VoucherBFDDetail — renew new detail row (Dr new detail)
            if (isRenew && newDetail != null && vcrNewBfd != null)
            {
                await _context.voucherbfddetail.AddAsync(new VoucherBFDDetail
                {
                    BrId = branchId,
                    VoucherId = voucher.Id,
                    VAccCrDrId = vcrNewBfd.Id,
                    FDAccId = accId,
                    FDAccDetId = newDetail.ID,
                    AmountCr = 0,
                    AmountDr = closureAmount - tdsAmount,
                    Operation = "RC",
                    ValueDate = vDate,
                    VoucherDate = vDate,
                    VoucherMainStatus = voucherStatus
                });
            }

            // Update old detail status and TDS
            detail.FDStatus = isPremature ? 3 : (isRenew ? 4 : 2);
            detail.TdsAmount = tdsAmount;

            await _context.SaveChangesAsync();
            return (voucherNo, null);
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private static VoucherCreditDebitDetails MakeEntry(
            long headCode, int accId, int branchId,
            string entryType, string narration, decimal amount,
            string voucherStatus, DateTime valueDate, int voucherId, int seq)
        {
            return new VoucherCreditDebitDetails
            {
                AccHeadCode = headCode,
                AccountId = accId,
                BrId = branchId,
                EntryStatus = entryType,
                Narration = narration,
                VoucherAmount = amount,
                VoucherStatus = voucherStatus,
                ValueDate = valueDate,
                VoucherEntryType = entryType,
                VoucherID = voucherId,
                VoucherSeqNo = seq,
                ExpenseAmt = 0,
                HCL1 = 0, HCL2 = 0, HCL3 = 0
            };
        }

        private static DateTime CalcMaturityDate(DateTime fromDate, int months, int days)
        {
            var d = fromDate.AddMonths(months).AddDays(days);
            return DateTime.SpecifyKind(d, DateTimeKind.Unspecified);
        }
    }
}
