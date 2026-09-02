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

    public class BankFDIPPreviewRow
    {
        public int AccId { get; set; }
        public int DetailId { get; set; }
        public string AccNo { get; set; } = "";
        public string AccName { get; set; } = "";
        public string LTDNo { get; set; } = "";
        public decimal FDBalance { get; set; }
        public decimal IntAmount { get; set; }
        public decimal TDSAmount { get; set; }
        public double TDSRate { get; set; }
        public DateTime LastPostingDate { get; set; }
        public double IntRate { get; set; }
        public int IntCompInterval { get; set; }
    }

    public class BankFDIPRowDTO
    {
        public int AccId { get; set; }
        public int DetailId { get; set; }
        public decimal IntAmount { get; set; }
        public decimal TDSAmount { get; set; }
        public DateTime LastPostingDate { get; set; }
    }

    public class BankFDIPPostRequest
    {
        public int BranchId { get; set; }
        public DateTime VoucherDate { get; set; }
        public int CreditAccId { get; set; }   // Interest income GL account
        public string Narration { get; set; } = "";
        public List<BankFDIPRowDTO> Rows { get; set; } = new();
    }

    // ──────────────────────────── Controller ────────────────────────────

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BankFDInterestPostingController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly ILogger<BankFDInterestPostingController> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public BankFDInterestPostingController(
            BankingDbContext context,
            CommonFunctions commonFunctions,
            ILogger<BankFDInterestPostingController> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _commonFunctions = commonFunctions;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        // ── GET /{branchId}/accounts  — BFD accounts under a head (for dropdown) ─
        [HttpGet("{branchId}/accounts")]
        public async Task<IActionResult> GetAccounts(int branchId, [FromQuery] int headId = 0)
        {
            try
            {
                var q = _context.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId && a.AccTypeId == 8 && a.IsAccClosed != true);
                if (headId > 0)
                    q = q.Where(a => a.HeadId == headId);

                var list = await q
                    .OrderBy(a => a.AccSuffix)
                    .Select(a => new { accId = a.ID, accNo = $"{a.AccPrefix ?? "BFD"}-{a.AccSuffix}", accountName = a.AccountName ?? "" })
                    .ToListAsync();

                return Ok(new { Success = true, Data = list });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAccounts error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── GET /{branchId}/preview  — Calculate interest for all matching FD details ─
        // Query params:
        //   headId   – filter by accountmaster.headid  (0 = all heads)
        //   accId    – specific accountmaster.ID       (0 = all accounts under head)
        //   currDate – posting date  (YYYY-MM-DD)
        //   fromDate – optional override for period start (YYYY-MM-DD)
        [HttpGet("{branchId}/preview")]
        public async Task<IActionResult> GetPreview(
            int branchId,
            [FromQuery] int headId = 0,
            [FromQuery] int accId = 0,
            [FromQuery] string? currDate = null,
            [FromQuery] string? fromDate = null)
        {
            try
            {
                DateTime postingDate = currDate != null && DateTime.TryParse(currDate, out var pd)
                    ? pd.Date : DateTime.Today;
                DateTime? fromDateOverride = fromDate != null && DateTime.TryParse(fromDate, out var fd)
                    ? fd.Date : (DateTime?)null;

                // First session from date — don't calculate interest before this
                var (firstSessionFrom, _) = await _commonFunctions.FirstSessionFromDateAndToDate(branchId);

                // TDS settings
                var tdsSetting = await _context.tdssettings.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.branchid == branchId);
                // TDS at interest posting = DeductionFrequency 5
                bool tdsEnabled = tdsSetting?.bankFDTDSApplicability == true
                               && tdsSetting.bankFDTDSDeductionFrequency == 5;

                List<FDTDSSlabDetail> tdsDetails = new();
                if (tdsEnabled)
                {
                    var latestSlab = await _context.fdtdsslab.AsNoTracking()
                        .Where(x => x.BrId == branchId)
                        .OrderByDescending(x => x.Date)
                        .FirstOrDefaultAsync();
                    if (latestSlab != null)
                        tdsDetails = await _context.fdtdsslabdetail.AsNoTracking()
                            .Where(x => x.BrId == branchId && x.SlabID == latestSlab.ID)
                            .ToListAsync();
                }

                // Accounts filter
                var accountQuery = _context.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId && a.AccTypeId == 8 && a.IsAccClosed != true);
                if (headId > 0)
                    accountQuery = accountQuery.Where(a => a.HeadId == headId);
                if (accId > 0)
                    accountQuery = accountQuery.Where(a => a.ID == accId);

                var accounts = await accountQuery.ToListAsync();
                if (!accounts.Any())
                    return Ok(new { Success = true, Data = new List<BankFDIPPreviewRow>() });

                var accountIds = accounts.Select(a => a.ID).ToList();
                var accountMap = accounts.ToDictionary(a => a.ID);

                // Active FD details — not yet matured as of posting date
                var details = await _context.bankfdaccountdetail.AsNoTracking()
                    .Where(d => d.BrId == branchId
                             && accountIds.Contains(d.AccId)
                             && d.FDStatus == 1
                             && d.FDMaturityDate.Date >= postingDate)
                    .ToListAsync();

                if (!details.Any())
                    return Ok(new { Success = true, Data = new List<BankFDIPPreviewRow>() });

                var rows = new List<BankFDIPPreviewRow>();

                foreach (var det in details)
                {
                    // Last IP posting date for this FD detail
                    DateTime? lastIPDate = await _context.voucherbfddetail.AsNoTracking()
                        .Where(b => b.BrId == branchId
                                 && b.FDAccId == det.AccId
                                 && b.FDAccDetId == det.ID
                                 && b.Operation == "IP"
                                 && b.VoucherMainStatus != "D")
                        .MaxAsync(b => (DateTime?)b.ValueDate);

                    // Determine start of interest period
                    DateTime lastPostingDate;
                    if (!lastIPDate.HasValue)
                    {
                        // No previous posting — use override, first session, or FD date (whichever is later)
                        DateTime baseDate = fromDateOverride
                            ?? (firstSessionFrom != DateTime.MinValue ? firstSessionFrom.Date : det.FDDate.Date);
                        lastPostingDate = det.FDDate.Date > baseDate ? det.FDDate.Date : baseDate;
                    }
                    else
                    {
                        lastPostingDate = lastIPDate.Value.Date;
                    }

                    if (lastPostingDate >= postingDate) continue;

                    // FD balance as of lastPostingDate (inclusive)
                    decimal fdBalance = await CalculateFDBalanceAsync(branchId, det.AccId, det.ID, lastPostingDate.AddDays(1));
                    if (fdBalance <= 0) fdBalance = det.FDAmount;

                    // FD compound interest: A = P × (1 + r/n/100)^(n×t)
                    double days = (postingDate - lastPostingDate).TotalDays;
                    if (days <= 0) continue;

                    // IntCompInterval stores n directly (12=Monthly, 4=Quarterly, 2=Half-Yearly, 1=Yearly)
                    int n = det.IntCompInterval > 0 ? det.IntCompInterval : 1;
                    double t = days / 365.0;
                    double A = (double)fdBalance * Math.Pow(1.0 + det.IntRate / (n * 100.0), n * t);
                    decimal intAmount = Math.Max(0m, (decimal)Math.Round(A - (double)fdBalance));

                    // Cap at remaining interest to maturity
                    decimal maxInt = Math.Max(0m, det.MaturityAmount - fdBalance);
                    intAmount = Math.Min(intAmount, maxInt);
                    if (intAmount <= 0) continue;

                    // TDS
                    decimal tdsAmount = 0m;
                    double tdsRate = 0;
                    if (tdsEnabled && tdsDetails.Any())
                    {
                        var slabRow = tdsDetails.FirstOrDefault(s => intAmount >= s.FromAmount && intAmount <= s.ToAmount);
                        if (slabRow != null)
                        {
                            tdsRate = slabRow.IntRate;
                            tdsAmount = Math.Round(intAmount * (decimal)slabRow.IntRate / 100m, 0);
                        }
                    }

                    var acc = accountMap[det.AccId];
                    rows.Add(new BankFDIPPreviewRow
                    {
                        AccId = det.AccId,
                        DetailId = det.ID,
                        AccNo = $"{acc.AccPrefix ?? "BFD"}-{acc.AccSuffix}",
                        AccName = acc.AccountName ?? "",
                        LTDNo = det.LTDNo,
                        FDBalance = fdBalance,
                        IntAmount = intAmount,
                        TDSAmount = tdsAmount,
                        TDSRate = tdsRate,
                        LastPostingDate = lastPostingDate,
                        IntRate = det.IntRate,
                        IntCompInterval = det.IntCompInterval,
                    });
                }

                return Ok(new { Success = true, Data = rows });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BankFDInterestPosting preview error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── POST /{branchId}/post  — Save interest posting voucher ─
        [HttpPost("{branchId}/post")]
        public async Task<IActionResult> PostInterest(int branchId, [FromBody] BankFDIPPostRequest req)
        {
            try
            {
                var activeRows = req.Rows.Where(r => r.IntAmount > 0).ToList();
                if (!activeRows.Any())
                    return BadRequest(new ResponseDto { Success = false, Message = "No interest rows to post." });
                if (req.CreditAccId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "Credit (interest income) account is required." });

                var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
                var userIdStr = claimsPrincipal?.FindFirst("userId")?.Value
                             ?? claimsPrincipal?.FindFirst("UserId")?.Value
                             ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                int userId = int.TryParse(userIdStr, out var uid) ? uid : 0;

                bool autoVerify = await _commonFunctions.IsAutoVerification(branchId);
                string vStatus = autoVerify ? "V" : "A";
                DateTime vDate = DateTime.SpecifyKind(req.VoucherDate.Date, DateTimeKind.Unspecified);
                int voucherNo = await _commonFunctions.GetLatestVoucherNo(branchId, req.VoucherDate);

                string narration = string.IsNullOrWhiteSpace(req.Narration)
                    ? $"Bank FD Interest Posting — {req.VoucherDate:dd-MMM-yyyy}"
                    : req.Narration;

                // TDS account from settings
                var tdsSetting = await _context.tdssettings.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.branchid == branchId);
                int tdsAccId = tdsSetting?.bankFDTDSLedgerAccountId ?? 0;
                long tdsHeadCode = tdsAccId > 0
                    ? await _commonFunctions.GetAccountHeadCodeFromAccId(tdsAccId, branchId)
                    : 0;

                long creditHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(req.CreditAccId, branchId);

                var voucher = new Voucher
                {
                    BrID = branchId,
                    VoucherNo = voucherNo,
                    VoucherType = (int)Enums.VoucherType.BankFD,
                    VoucherSubType = (int)Enums.VoucherSubType.InterestPosting,
                    VoucherDate = vDate,
                    ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherNarration = narration,
                    VoucherStatus = vStatus,
                    AddedBy = userId,
                    ModifiedBy = 0,
                    VerifiedBy = autoVerify ? userId : 0,
                    OtherBrID = 0
                };
                await _context.voucher.AddAsync(voucher);
                await _context.SaveChangesAsync();

                int seq = 1;

                foreach (var row in activeRows)
                {
                    long bfdHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(row.AccId, branchId);

                    // Entry 1: Dr BFD account — gross interest earned
                    var vcrDr = MakeEntry(bfdHeadCode, row.AccId, branchId, "Dr",
                        narration, row.IntAmount, vStatus, vDate, voucher.Id, seq++);
                    _context.vouchercreditdebitdetails.Add(vcrDr);
                    await _context.SaveChangesAsync();

                    // voucherbfddetail — IP row (AmountDr = interest accrued on the FD)
                    await _context.voucherbfddetail.AddAsync(new VoucherBFDDetail
                    {
                        BrId = branchId,
                        VoucherId = voucher.Id,
                        VAccCrDrId = vcrDr.Id,
                        FDAccId = row.AccId,
                        FDAccDetId = row.DetailId,
                        AmountDr = row.IntAmount,
                        AmountCr = 0,
                        Operation = "IP",
                        ValueDate = vDate,
                        VoucherDate = vDate,
                        VoucherMainStatus = vStatus
                    });

                    // Entry 2: Cr Interest Income — gross interest
                    _context.vouchercreditdebitdetails.Add(
                        MakeEntry(creditHeadCode, req.CreditAccId, branchId, "Cr",
                            narration, row.IntAmount, vStatus, vDate, voucher.Id, seq++));

                    // TDS entries (only if TDS amount > 0 and TDS account configured)
                    if (row.TDSAmount > 0 && tdsAccId > 0 && tdsHeadCode > 0)
                    {
                        // Entry 3: Dr TDS Receivable — TDS claimable from IT dept
                        _context.vouchercreditdebitdetails.Add(
                            MakeEntry(tdsHeadCode, tdsAccId, branchId, "Dr",
                                "TDS on Bank FD Interest", row.TDSAmount, vStatus, vDate, voucher.Id, seq++));

                        // Entry 4: Cr BFD account — bank reduces FD balance by TDS
                        var vcrCrTds = MakeEntry(bfdHeadCode, row.AccId, branchId, "Cr",
                            "TDS deducted by bank on FD interest", row.TDSAmount, vStatus, vDate, voucher.Id, seq++);
                        _context.vouchercreditdebitdetails.Add(vcrCrTds);
                        await _context.SaveChangesAsync();

                        // voucherbfddetail — TDS Cr row (reduces FD balance)
                        await _context.voucherbfddetail.AddAsync(new VoucherBFDDetail
                        {
                            BrId = branchId,
                            VoucherId = voucher.Id,
                            VAccCrDrId = vcrCrTds.Id,
                            FDAccId = row.AccId,
                            FDAccDetId = row.DetailId,
                            AmountDr = 0,
                            AmountCr = row.TDSAmount,
                            Operation = "IT",   // Interest-TDS
                            ValueDate = vDate,
                            VoucherDate = vDate,
                            VoucherMainStatus = vStatus
                        });
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = $"Voucher saved successfully with voucher no. {voucherNo}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BankFDInterestPosting post error");
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        // Replicates BankFDLedgerService.CalculateOpeningBalanceAsync for a single detail.
        // Returns the running balance of the BFD account up to (not including) beforeDate.
        private async Task<decimal> CalculateFDBalanceAsync(
            int branchId, int accountId, int detailId, DateTime beforeDate)
        {
            decimal balance = await _context.bankfdaccountopeningbalance.AsNoTracking()
                .Where(x => x.BranchID == branchId && x.AccountId == accountId && x.FDAccDetId == detailId)
                .SumAsync(x => x.Balance);

            var entryIds = await _context.voucherbfddetail.AsNoTracking()
                .Where(x => x.BrId == branchId && x.FDAccDetId == detailId)
                .Select(x => x.VAccCrDrId)
                .ToListAsync();

            if (!entryIds.Any()) return balance;

            var movements = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.AccountId == accountId
                         && entryIds.Contains(x.Id)
                         && x.ValueDate < beforeDate.Date
                         && x.VoucherStatus != "D")
                .Select(x => new { x.VoucherAmount, x.VoucherEntryType })
                .ToListAsync();

            foreach (var m in movements)
            {
                if (m.VoucherEntryType == "Cr") balance += m.VoucherAmount;
                else balance -= m.VoucherAmount;
            }

            return balance;
        }

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
    }
}
