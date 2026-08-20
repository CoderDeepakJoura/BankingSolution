using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BankingPlatform.API.Service.AccountMasters
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class SavingInterestAccountDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public decimal CurrentBalance { get; set; }
        public decimal CalculatedInterest { get; set; }
        public List<MonthlyInterestBreakdownDTO> MonthlyBreakdown { get; set; } = new();
    }


    public class MonthlyInterestBreakdownDTO
    {
        public string Month { get; set; } = "";       // "April 2025"
        public decimal EffectiveBalance { get; set; } // min balance or avg balance
        public int Days { get; set; }
        public decimal Rate { get; set; }
        public decimal Interest { get; set; }
    }

    public class PostSavingInterestDTO
    {
        public int BranchId { get; set; }
        public int ProductId { get; set; }
        /// <summary>The date written on the voucher (when the posting was made).</summary>
        public DateTime VoucherDate { get; set; }
        /// <summary>Interest calculation period end date (required).</summary>
        public DateTime ToDate { get; set; }
        /// <summary>Interest calculation period start override (optional). When null the service uses auto-detected periodStart.</summary>
        public DateTime? FromDate { get; set; }
        public List<int> AccountIds { get; set; } = new();
        // Key = accountId, Value = SU-overridden interest amount (null = use calculated)
        public Dictionary<int, decimal>? InterestOverrides { get; set; }
        // For Fixed Rate products: user-entered rate (RateAppliedMethod == 2)
        public decimal? FixedRate { get; set; }
    }

    // ── Service ──────────────────────────────────────────────────────────────────

    public class SavingInterestPostingService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly MemberService _memberService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SavingInterestPostingService(
            BankingDbContext context,
            CommonFunctions commonFunctions,
            MemberService memberService,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _commonFunctions = commonFunctions;
            _memberService = memberService;
            _httpContextAccessor = httpContextAccessor;
        }

        // ── Get eligible accounts ─────────────────────────────────────────────────

        public async Task<List<SavingInterestAccountDTO>> GetEligibleAccountsAsync(
            int branchId, int productId, DateTime toDate, DateTime? fromDate = null, decimal? fixedRate = null)
        {
            var rules = await GetInterestRules(branchId, productId);
            if (rules == null) return new();

            // All open saving accounts for this product opened on or before toDate
            var accounts = await _context.accountmaster
                .AsNoTracking()
                .Where(x => x.BranchId == branchId
                    && x.AccTypeId == (int)Enums.AccountTypes.Saving
                    && x.GeneralProductId == productId
                    && !x.IsAccClosed
                    && x.AccOpeningDate <= toDate.Date)
                .ToListAsync();

            // Without fromDate: exclude accounts already fully covered in the current interval period
            // (quick filter — avoids calculating per-account when clearly nothing is pending).
            // With fromDate: don't bulk-exclude. CalculateInterestForAccount will advance past any
            // existing postings inside [fromDate, toDate] and compute only the remaining interest.
            if (!fromDate.HasValue)
            {
                var accountIds = accounts.Select(a => a.ID).ToList();
                DateTime periodStartForExclusion = GetPeriodStart(toDate, rules.IntPostingInterval);
                var alreadyPostedIds = await _context.vouchercreditdebitdetails
                    .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                    .Where(x => x.v.BrID == branchId
                        && x.v.VoucherType == (int)Enums.VoucherType.Saving
                        && x.v.VoucherSubType == (int)Enums.VoucherSubType.InterestPosting
                        && x.v.VoucherDate.Date >= periodStartForExclusion.Date
                        && x.v.VoucherDate.Date <= toDate.Date
                        && x.e.VoucherEntryType == "Cr"
                        && accountIds.Contains(x.e.AccountId))
                    .Select(x => x.e.AccountId)
                    .Distinct()
                    .ToListAsync();
                accounts = accounts.Where(a => !alreadyPostedIds.Contains(a.ID)).ToList();
            }

            var result = new List<SavingInterestAccountDTO>();
            foreach (var acc in accounts)
            {
                var calc = await CalculateInterestForAccount(branchId, acc.ID, toDate, rules, fixedRate, fromDate);
                result.Add(new SavingInterestAccountDTO
                {
                    AccountId = acc.ID,
                    AccountNumber = $"{acc.AccPrefix}-{acc.AccSuffix}",
                    AccountName = acc.AccountName ?? "",
                    CurrentBalance = await GetCurrentBalance(branchId, acc.ID),
                    CalculatedInterest = calc.TotalInterest,
                    MonthlyBreakdown = calc.Breakdown,
                });
            }

            return result
                .Where(r => r.CalculatedInterest >= (rules.MinPostingIntAmt > 0 ? rules.MinPostingIntAmt : 0.01m))
                .ToList();
        }

        // ── Closing preview ───────────────────────────────────────────────────────

        public async Task<(decimal Balance, decimal CalculatedInterest)> GetClosingPreviewAsync(
            int branchId, int accountId, int productId, DateTime asOfDate)
        {
            decimal balance = await GetCurrentBalance(branchId, accountId);
            var rules = await GetInterestRules(branchId, productId);
            if (rules == null) return (balance, 0);
            var calc = await CalculateInterestForAccount(branchId, accountId, asOfDate, rules);
            return (balance, Math.Round(calc.TotalInterest, 0, MidpointRounding.AwayFromZero));
        }

        // ── Post interest ─────────────────────────────────────────────────────────

        public async Task<string> PostInterestAsync(PostSavingInterestDTO dto)
        {
            var rules = await GetInterestRules(dto.BranchId, dto.ProductId);
            if (rules == null) return "Interest rules not configured for this product.";

            var branchWise = await _context.savingproductbranchwiserule
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == dto.BranchId && x.SavingProductId == dto.ProductId);
            if (branchWise == null) return "Branch-wise rules not configured for this product.";
            if (branchWise.intexpaccount <= 0) return "Interest expense account is not configured in the branch-wise rule for this product. Please set it before posting interest.";

            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var userIdClaim = claimsPrincipal?.FindFirst("userId")?.Value
                           ?? claimsPrincipal?.FindFirst("UserId")?.Value
                           ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            bool isAutoVerification = await _commonFunctions.IsAutoVerification(dto.BranchId);
            string voucherStatus = isAutoVerification ? "V" : "A";
            DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
            DateTime valueDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // First pass: calculate interest for every requested account
                var postings = new List<(int AccountId, decimal Interest)>();
                foreach (var accountId in dto.AccountIds)
                {
                    var calc = await CalculateInterestForAccount(dto.BranchId, accountId, dto.ToDate, rules, dto.FixedRate, dto.FromDate);
                    if (calc.TotalInterest <= 0 && !(dto.InterestOverrides?.ContainsKey(accountId) == true)) continue;

                    decimal interestAmt = (dto.InterestOverrides != null && dto.InterestOverrides.TryGetValue(accountId, out var ov))
                        ? Math.Round(ov, 0, MidpointRounding.AwayFromZero)
                        : Math.Round(calc.TotalInterest, 0, MidpointRounding.AwayFromZero);
                    if (interestAmt <= 0) continue;

                    postings.Add((accountId, interestAmt));
                }

                if (!postings.Any())
                {
                    await transaction.RollbackAsync();
                    return "No accounts eligible for interest posting.";
                }

                decimal totalInterest = postings.Sum(p => p.Interest);

                // ONE voucher for all accounts
                int nextVrNo = await _commonFunctions.GetLatestVoucherNo(dto.BranchId, dto.VoucherDate);
                var voucherEntity = new VoucherDTO
                {
                    ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate = voucherDate,
                    AddedBy = int.Parse(userIdClaim!),
                    BrID = dto.BranchId,
                    ModifiedBy = 0,
                    VerifiedBy = isAutoVerification ? int.Parse(userIdClaim!) : 0,
                    VoucherNarration = "Saving Interest Posting",
                    OtherBrID = 0,
                    VoucherNo = nextVrNo,
                    VoucherStatus = voucherStatus,
                    VoucherType = (int)Enums.VoucherType.Saving,
                    VoucherSubType = (int)Enums.VoucherSubType.InterestPosting,
                };
                var voucherInfo = _memberService.MapToEntity(voucherEntity);
                await _context.voucher.AddAsync(voucherInfo);
                await _context.SaveChangesAsync();

                int row = 1;

                // Dr: interest expense GL (combined total for all accounts)
                long expHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(branchWise.intexpaccount, dto.BranchId);
                var drEntry = _memberService.voucherCreditDebitDetails(
                    expHeadCode, branchWise.intexpaccount, dto.BranchId,
                    Enums.VoucherStatus.Dr.ToString(),
                    "Saving Interest Posting", totalInterest, voucherStatus,
                    valueDate, "Dr", voucherInfo.Id, row);
                _context.vouchercreditdebitdetails.Add(drEntry);
                await _context.SaveChangesAsync();
                row++;

                // Cr: one entry per member saving account
                foreach (var (accountId, interestAmt) in postings)
                {
                    long accHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(accountId, dto.BranchId);
                    var crEntry = _memberService.voucherCreditDebitDetails(
                        accHeadCode, accountId, dto.BranchId,
                        Enums.VoucherStatus.Cr.ToString(),
                        "Saving Interest Posting", interestAmt, voucherStatus,
                        valueDate, "Cr", voucherInfo.Id, row);
                    _context.vouchercreditdebitdetails.Add(crEntry);
                    row++;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "Success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"Error: {ex.Message}";
            }
        }

        // ── Core calculation ──────────────────────────────────────────────────────

        private async Task<(decimal TotalInterest, List<MonthlyInterestBreakdownDTO> Breakdown)>
            CalculateInterestForAccount(
                int branchId, int accountId, DateTime toDate,
                Infrastructure.Models.ProductMasters.Saving.SavingsProductInterestRules rules,
                decimal? fixedRate = null,
                DateTime? fromDateOverride = null)
        {
            bool isMinBalance = rules.CalculationMethod == 1;

            // Days in year from branch-wise rule (360 or 365); default 365
            int daysInYear = await _context.savingproductbranchwiserule
                .AsNoTracking()
                .Where(x => x.BranchId == branchId && x.SavingProductId == rules.SavingsProductId)
                .Select(x => x.DaysInAYear)
                .FirstOrDefaultAsync();
            if (daysInYear <= 0) daysInYear = 365;

            // Required minimum balance from product rules (0 = no requirement)
            decimal requiredMinBalance = await _context.savingproductrules
                .AsNoTracking()
                .Where(x => x.BranchId == branchId && x.SavingsProductId == rules.SavingsProductId)
                .Select(x => x.MinBalanceAmt)
                .FirstOrDefaultAsync();

            DateTime periodStart;

            if (fromDateOverride.HasValue)
            {
                // Find the latest interest posting in [fromDate, toDate] for this account.
                // If one exists it means that period is already covered — advance past it so
                // only the remaining unpaid portion is calculated. If none exists, use fromDate directly.
                var latestPostingInRange = await _context.vouchercreditdebitdetails
                    .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                    .Where(x => x.v.BrID == branchId
                        && x.v.VoucherType == (int)Enums.VoucherType.Saving
                        && x.v.VoucherSubType == (int)Enums.VoucherSubType.InterestPosting
                        && x.e.AccountId == accountId
                        && x.e.VoucherEntryType == "Cr"
                        && x.v.VoucherDate.Date >= fromDateOverride.Value.Date
                        && x.v.VoucherDate.Date <= toDate.Date)
                    .OrderByDescending(x => x.v.VoucherDate)
                    .Select(x => (DateTime?)x.v.VoucherDate)
                    .FirstOrDefaultAsync();

                periodStart = latestPostingInRange.HasValue
                    ? latestPostingInRange.Value.Date.AddDays(1)
                    : fromDateOverride.Value.Date;
            }
            else
            {
                // Auto-detect: day after last interest posting, or account opening date
                var lastPosting = await _context.vouchercreditdebitdetails
                    .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                    .Where(x => x.v.BrID == branchId
                        && x.v.VoucherType == (int)Enums.VoucherType.Saving
                        && x.v.VoucherSubType == (int)Enums.VoucherSubType.InterestPosting
                        && x.e.AccountId == accountId
                        && x.e.VoucherEntryType == "Cr"
                        && x.v.VoucherDate.Date <= toDate.Date)
                    .OrderByDescending(x => x.v.VoucherDate)
                    .Select(x => (DateTime?)x.v.VoucherDate)
                    .FirstOrDefaultAsync();

                if (lastPosting.HasValue)
                {
                    periodStart = lastPosting.Value.Date.AddDays(1);
                }
                else
                {
                    var accOpenDate = await _context.accountmaster
                        .Where(x => x.ID == accountId)
                        .Select(x => (DateTime?)x.AccOpeningDate)
                        .FirstOrDefaultAsync();

                    DateTime baseDate = accOpenDate?.Date ?? toDate.Date;

                    // Never calculate interest before the branch's first session start date
                    var (firstSessionFrom, _) = await _commonFunctions.FirstSessionFromDateAndToDate(branchId);
                    periodStart = (firstSessionFrom != DateTime.MinValue && firstSessionFrom.Date > baseDate)
                        ? firstSessionFrom.Date
                        : baseDate;
                }
            }

            if (periodStart > toDate.Date)
                return (0, new());

            // Get opening balance
            decimal openingBal = await GetOpeningBalance(branchId, accountId);

            // Get all transactions in the period
            var transactions = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == accountId
                    && x.v.BrID == branchId
                    && (x.v.VoucherStatus == "V" || x.v.VoucherStatus == "A")
                    && x.v.VoucherDate.Date < periodStart.Date)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    BalanceBefore = g.Sum(x => x.e.VoucherEntryType == "Cr" ? x.e.VoucherAmount : -x.e.VoucherAmount)
                })
                .FirstOrDefaultAsync();

            // Balance at period start = opening balance + all prior voucher movements
            decimal balanceAtPeriodStart = openingBal + (transactions?.BalanceBefore ?? 0);

            // All transactions within the period
            var periodTxns = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == accountId
                    && x.v.BrID == branchId
                    && (x.v.VoucherStatus == "V" || x.v.VoucherStatus == "A")
                    && x.v.VoucherDate.Date >= periodStart.Date
                    && x.v.VoucherDate.Date <= toDate.Date)
                .OrderBy(x => x.v.VoucherDate)
                .ThenBy(x => x.e.Id)
                .Select(x => new
                {
                    Date = x.v.VoucherDate.Date,
                    Amount = x.e.VoucherEntryType == "Cr" ? x.e.VoucherAmount : -x.e.VoucherAmount
                })
                .ToListAsync();

            // Helper: get balance on a given date
            decimal BalanceOnDate(DateTime date)
            {
                decimal bal = balanceAtPeriodStart;
                foreach (var txn in periodTxns.Where(t => t.Date <= date))
                    bal += txn.Amount;
                return bal;
            }

            // Monthly breakdown
            var breakdown = new List<MonthlyInterestBreakdownDTO>();
            decimal totalInterest = 0;

            DateTime cursor = new DateTime(periodStart.Year, periodStart.Month, 1);
            while (cursor <= toDate.Date)
            {
                DateTime monthStart = cursor;
                DateTime monthEnd = new DateTime(cursor.Year, cursor.Month,
                    DateTime.DaysInMonth(cursor.Year, cursor.Month));

                // Clamp to period boundaries
                DateTime effectiveStart = monthStart < periodStart ? periodStart : monthStart;
                DateTime effectiveEnd = monthEnd > toDate.Date ? toDate.Date : monthEnd;

                int daysInMonth = (effectiveEnd - effectiveStart).Days + 1;

                decimal monthlyInterest;
                decimal effectiveBalance;
                decimal monthRate = 0;

                if (isMinBalance)
                {
                    // Minimum balance: ignore first 10 days, find min from day 11 to end
                    DateTime minBalStart = new DateTime(cursor.Year, cursor.Month, 11);
                    if (minBalStart < effectiveStart) minBalStart = effectiveStart;
                    if (minBalStart > effectiveEnd)
                    {
                        // Entire month is within first 10 days — skip
                        cursor = cursor.AddMonths(1);
                        continue;
                    }

                    // Opening of day 11 = closing of day 10 (before any transactions on day 11)
                    // Case 1 — deposit on day 11: opening=1000, closing=1200 → min=1000 ✓
                    // Case 2 — withdrawal on day 11: opening=1000, closing=800  → min=800  ✓
                    decimal minBal = BalanceOnDate(minBalStart.AddDays(-1)); // day 10 closing = day 11 opening

                    // Then check closing of each day from day 11 to effectiveEnd
                    for (DateTime d = minBalStart; d <= effectiveEnd; d = d.AddDays(1))
                    {
                        decimal dayClosing = BalanceOnDate(d);
                        if (dayClosing < minBal) minBal = dayClosing;
                    }

                    effectiveBalance = minBal < 0 ? 0 : minBal;

                    // Resolve the applicable rate for this month's balance (slab-wise or fixed)
                    monthRate = await GetRateForBalance(branchId, rules.SavingsProductId, effectiveBalance, toDate, rules, fixedRate);

                    // If a minimum balance requirement is configured and not met this month,
                    // record the month with zero interest and move on
                    if (requiredMinBalance > 0 && effectiveBalance < requiredMinBalance)
                    {
                        breakdown.Add(new MonthlyInterestBreakdownDTO
                        {
                            Month = cursor.ToString("MMMM yyyy"),
                            EffectiveBalance = Math.Round(effectiveBalance, 2),
                            Days = daysInMonth,
                            Rate = monthRate,
                            Interest = 0,
                        });
                        cursor = cursor.AddMonths(1);
                        continue;
                    }

                    // Interest calculated on full month days
                    int fullMonthDays = DateTime.DaysInMonth(cursor.Year, cursor.Month);
                    monthlyInterest = effectiveBalance * monthRate * fullMonthDays / (100m * daysInYear);
                }
                else
                {
                    // Balance method: sum of (balance × days) for each sub-period
                    decimal productSum = 0;
                    DateTime subStart = effectiveStart;
                    decimal currentBal = BalanceOnDate(effectiveStart);

                    var monthTxns = periodTxns
                        .Where(t => t.Date > effectiveStart && t.Date <= effectiveEnd)
                        .GroupBy(t => t.Date)
                        .OrderBy(g => g.Key)
                        .ToList();

                    foreach (var grp in monthTxns)
                    {
                        int days = (grp.Key - subStart).Days;
                        if (days > 0) productSum += currentBal * days;
                        currentBal += grp.Sum(t => t.Amount);
                        subStart = grp.Key;
                    }

                    // Remaining days after last transaction
                    int remainDays = (effectiveEnd - subStart).Days + 1;
                    productSum += currentBal * remainDays;

                    effectiveBalance = productSum / daysInMonth; // avg balance for display
                    monthRate = await GetRateForBalance(branchId, rules.SavingsProductId, effectiveBalance, toDate, rules, fixedRate);
                    monthlyInterest = productSum * monthRate / (100m * daysInYear);
                }

                if (monthlyInterest < 0) monthlyInterest = 0;
                decimal roundedMonthly = Math.Round(monthlyInterest, 0, MidpointRounding.AwayFromZero);
                totalInterest += roundedMonthly;

                breakdown.Add(new MonthlyInterestBreakdownDTO
                {
                    Month = cursor.ToString("MMMM yyyy"),
                    EffectiveBalance = Math.Round(effectiveBalance, 2),
                    Days = daysInMonth,
                    Rate = monthRate,
                    Interest = roundedMonthly,
                });

                cursor = cursor.AddMonths(1);
            }

            return (totalInterest, breakdown);
        }

        // ── Helpers ──────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns the interest rate for a given balance.
        /// RateAppliedMethod 2 = Fixed Rate (user supplies rate via UI).
        /// RateAppliedMethod 1 or 3 = Slab wise — looks up savinginterestslabdetail.
        /// </summary>
        private async Task<decimal> GetRateForBalance(
            int branchId, int productId, decimal balance, DateTime postingDate,
            Infrastructure.Models.ProductMasters.Saving.SavingsProductInterestRules rules,
            decimal? fixedRate = null)
        {
            // Fixed Rate — use the value entered by the user in the UI
            if (rules.RateAppliedMethod == 2)
                return fixedRate > 0 ? fixedRate.Value : rules.InterestRateMinValue;

            // Slab wise (method 1 or 3): find the most recent applicable slab for this product
            var slabId = await _context.savinginterestslab
                .AsNoTracking()
                .Where(s => s.BranchId == branchId
                         && s.SavingProductId == productId
                         && s.ApplicableDate.Date <= postingDate.Date)
                .OrderByDescending(s => s.ApplicableDate)
                .Select(s => (int?)s.Id)
                .FirstOrDefaultAsync();

            if (slabId == null) return rules.InterestRateMinValue;

            // Find the slab detail whose balance range covers this balance
            var detail = await _context.savinginterestslabdetail
                .AsNoTracking()
                .Where(d => d.BranchId == branchId
                         && d.savingintslabId == slabId.Value
                         && d.fromamount <= balance
                         && (d.toamount == 0 || d.toamount >= balance))
                .OrderByDescending(d => d.fromamount)
                .FirstOrDefaultAsync();

            return detail?.interestrate ?? rules.InterestRateMinValue;
        }

        private async Task<decimal> GetOpeningBalance(int branchId, int accountId)
        {
            var ob = await _context.accopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.BranchId == branchId
                    && x.AccTypeId == (int)Enums.AccountTypes.Saving);
            if (ob == null) return 0;
            return ob.EntryType?.ToUpper() == "CR" ? ob.OpeningAmount : -ob.OpeningAmount;
        }

        private async Task<decimal> GetCurrentBalance(int branchId, int accountId)
        {
            decimal ob = await GetOpeningBalance(branchId, accountId);
            decimal cr = await _context.vouchercreditdebitdetails
                .Where(x => x.BrId == branchId && x.AccountId == accountId
                    && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                    && x.VoucherEntryType == "Cr")
                .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
            decimal dr = await _context.vouchercreditdebitdetails
                .Where(x => x.BrId == branchId && x.AccountId == accountId
                    && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                    && x.VoucherEntryType == "Dr")
                .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
            return ob + cr - dr;
        }

        public async Task<int> GetRateMethodAsync(int branchId, int productId)
        {
            var rules = await GetInterestRules(branchId, productId);
            return rules?.RateAppliedMethod ?? 3;
        }

        private async Task<Infrastructure.Models.ProductMasters.Saving.SavingsProductInterestRules?> GetInterestRules(
            int branchId, int productId)
        {
            return await _context.savingproductinterestrules
                .AsNoTracking()
                .Where(x => x.BranchId == branchId && x.SavingsProductId == productId)
                .OrderByDescending(x => x.ApplicableDate)
                .FirstOrDefaultAsync();
        }

        /// <summary>Returns the first day of the current posting interval period that contains postingDate.</summary>
        private static DateTime GetPeriodStart(DateTime postingDate, int intPostingInterval)
        {
            int month = postingDate.Month;
            int year = postingDate.Year;

            return intPostingInterval switch
            {
                2 => new DateTime(year, month, 1),                                    // Monthly
                3 => new DateTime(year, ((month - 1) / 3) * 3 + 1, 1),              // Quarterly
                4 => month <= 6                                                        // Half-Yearly (Indian FY: Apr-Sep, Oct-Mar)
                    ? new DateTime(year, 4, 1)
                    : new DateTime(year, 10, 1),
                5 => new DateTime(year, 4, 1),                                        // Yearly (Indian FY starts April)
                _ => new DateTime(year, month, 1),                                    // Default: monthly
            };
        }
    }
}
