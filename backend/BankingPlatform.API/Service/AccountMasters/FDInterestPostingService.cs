using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.AccMasters;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BankingPlatform.API.Service.AccountMasters
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class FDInterestDetailDTO
    {
        public int FDDetailId { get; set; }
        public int SerialNo { get; set; }
        public decimal FDAmount { get; set; }
        public DateTime FDDate { get; set; }
        public DateTime FDMaturityDate { get; set; }
        public decimal IntRate { get; set; }
        public int CompInterval { get; set; }
        public DateTime PeriodFrom { get; set; }
        public DateTime PeriodTo { get; set; }
        public int Days { get; set; }
        public decimal Interest { get; set; }
    }

    public class FDInterestAccountDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public decimal TotalInterest { get; set; }
        public List<FDInterestDetailDTO> Details { get; set; } = new();
    }

    public class PostFDInterestDTO
    {
        public int BranchId { get; set; }
        public int ProductId { get; set; }
        public DateTime PostingDate { get; set; }
        public List<int> AccountIds { get; set; } = new();
        /// <summary>Per-detail selection: when set, only these fdaccountdetail IDs are posted.
        /// Accounts to process are derived from the matching detail rows.</summary>
        public List<int>? SelectedDetailIds { get; set; }
        public bool IsMIS { get; set; }
        /// <summary>Interest override keyed by fdDetailId (fdaccountdetail.Id).</summary>
        public Dictionary<int, decimal>? InterestOverrides { get; set; }
    }

    // ── Service ──────────────────────────────────────────────────────────────────

    public class FDInterestPostingService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly MemberService _memberService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public FDInterestPostingService(
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

        public async Task<List<FDInterestAccountDTO>> GetEligibleAccountsAsync(
            int branchId, int productId, DateTime postingDate, bool isMIS, int? filterAccountId = null)
        {
            var productRule = await _context.fdproductrules.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.ProductId == productId);
            if (productRule == null) return new();

            bool productIsMIS = productRule.IntAccountType == (int)Enums.AccountTypeOfFDProduct.OtherAccount;
            if (productIsMIS != isMIS) return new();

            var branchWise = await _context.fdproductbranchwiserule.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.FDProductId == productId);
            if (branchWise == null) return new();

            int daysInYear = branchWise.DaysInAYear > 0 ? branchWise.DaysInAYear : 365;
            string operation = isMIS ? "MIP" : "IP";

            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                    && x.AccTypeId == (int)Enums.AccountTypes.FD
                    && x.GeneralProductId == productId
                    && !x.IsAccClosed
                    && (filterAccountId == null || x.ID == filterAccountId))
                .ToListAsync();

            var result = new List<FDInterestAccountDTO>();

            foreach (var acc in accounts)
            {
                var fdDetails = await _context.fdaccountdetail.AsNoTracking()
                    .Where(x => x.AccountId == acc.ID && x.BranchId == branchId
                        && x.FDStatus == (int)Enums.FDStatus.Open
                        && x.FDMaturityDate.Date >= postingDate.Date)
                    .ToListAsync();

                if (!fdDetails.Any()) continue;

                var accountDTO = new FDInterestAccountDTO
                {
                    AccountId = acc.ID,
                    AccountNumber = $"{acc.AccPrefix}-{acc.AccSuffix}",
                    AccountName = acc.AccountName ?? "",
                };

                foreach (var detail in fdDetails)
                {
                    int interval = isMIS
                        ? (detail.InterestPaidInterval ?? detail.IntCompInterval)
                        : detail.IntCompInterval;

                    if (interval == (int)Enums.CompoundingInterval.NoCompounding) continue;

                    var lastPeriodEnd = await _context.voucherfddetail.AsNoTracking()
                        .Where(x => x.FDAccDetId == detail.Id && x.BrId == branchId && x.Operation == operation)
                        .OrderByDescending(x => x.ValueDate)
                        .Select(x => (DateTime?)x.ValueDate)
                        .FirstOrDefaultAsync();

                    DateTime cursor = lastPeriodEnd.HasValue
                        ? lastPeriodEnd.Value.Date.AddDays(1)
                        : detail.FDDate.Date;

                    while (true)
                    {
                        DateTime periodEnd = GetPeriodEnd(cursor, interval);
                        bool isPartial = false;

                        if (periodEnd > postingDate.Date)
                        {
                            if (isMIS) break; // MIS never posts partial periods
                            periodEnd = postingDate.Date;
                            isPartial = true;
                        }
                        if (periodEnd > detail.FDMaturityDate.Date) break;

                        int days = (periodEnd - cursor).Days + 1;
                        decimal interest = isMIS
                            ? Math.Round(detail.FDAmount * (detail.IntRate / 100m) * GetIntervalMonths(interval) / 12m, 0, MidpointRounding.AwayFromZero)
                            : Math.Round(detail.FDAmount * (detail.IntRate / 100m) * days / daysInYear, 0, MidpointRounding.AwayFromZero);

                        if (interest > 0)
                        {
                            accountDTO.Details.Add(new FDInterestDetailDTO
                            {
                                FDDetailId = detail.Id,
                                SerialNo = detail.SerialNo,
                                FDAmount = detail.FDAmount,
                                FDDate = detail.FDDate,
                                FDMaturityDate = detail.FDMaturityDate,
                                IntRate = detail.IntRate,
                                CompInterval = interval,
                                PeriodFrom = cursor,
                                PeriodTo = periodEnd,
                                Days = days,
                                Interest = interest,
                            });
                        }

                        if (isPartial) break;
                        cursor = periodEnd.AddDays(1);
                    }
                }

                if (accountDTO.Details.Any())
                {
                    accountDTO.TotalInterest = accountDTO.Details.Sum(d => d.Interest);
                    result.Add(accountDTO);
                }
            }

            return result;
        }

        // ── Post interest ─────────────────────────────────────────────────────────

        public async Task<string> PostInterestAsync(PostFDInterestDTO dto)
        {
            var productRule = await _context.fdproductrules.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == dto.BranchId && x.ProductId == dto.ProductId);
            if (productRule == null) return "FD product rules not configured.";

            var branchWise = await _context.fdproductbranchwiserule.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == dto.BranchId && x.FDProductId == dto.ProductId);
            if (branchWise == null) return "Branch-wise rules not configured for this product.";
            if (branchWise.IntExpenseAccount <= 0)
                return "Interest expense account is not configured in branch-wise rules.";
            if (dto.IsMIS && branchWise.IntPayableAccount <= 0)
                return "Interest payable account is not configured in branch-wise rules.";

            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var userIdClaim = claimsPrincipal?.FindFirst("userId")?.Value
                           ?? claimsPrincipal?.FindFirst("UserId")?.Value
                           ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            bool isAutoVerification = await _commonFunctions.IsAutoVerification(dto.BranchId);
            string voucherStatus = isAutoVerification ? "V" : "A";
            DateTime voucherDate = DateTime.SpecifyKind(dto.PostingDate, DateTimeKind.Unspecified);
            DateTime valueDate = DateTime.SpecifyKind(dto.PostingDate, DateTimeKind.Utc);

            int daysInYear = branchWise.DaysInAYear > 0 ? branchWise.DaysInAYear : 365;
            string operation = dto.IsMIS ? "MIP" : "IP";
            int voucherSubType = dto.IsMIS
                ? (int)Enums.VoucherSubType.MISInterestPosting
                : (int)Enums.VoucherSubType.InterestPosting;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // When per-detail selection is used, derive the accounts to process from the detail IDs.
                var accountIdsToProcess = dto.AccountIds;
                if (dto.SelectedDetailIds != null && dto.SelectedDetailIds.Count > 0)
                {
                    accountIdsToProcess = await _context.fdaccountdetail.AsNoTracking()
                        .Where(x => dto.SelectedDetailIds.Contains(x.Id) && x.BranchId == dto.BranchId)
                        .Select(x => x.AccountId)
                        .Distinct()
                        .ToListAsync();
                }

                // First pass: collect all resolved period postings across all accounts
                var allPostings = new List<(int AccountId, FDAccountDetail Detail, DateTime From, DateTime To, decimal EffAmt)>();

                foreach (var accountId in accountIdsToProcess)
                {
                    var fdDetailsQuery = _context.fdaccountdetail
                        .Where(x => x.AccountId == accountId && x.BranchId == dto.BranchId
                            && x.FDStatus == (int)Enums.FDStatus.Open
                            && x.FDMaturityDate.Date >= dto.PostingDate.Date);

                    if (dto.SelectedDetailIds != null && dto.SelectedDetailIds.Count > 0)
                        fdDetailsQuery = fdDetailsQuery.Where(x => dto.SelectedDetailIds.Contains(x.Id));

                    var fdDetails = await fdDetailsQuery.ToListAsync();
                    if (!fdDetails.Any()) continue;

                    var periodPostings = new List<(FDAccountDetail Detail, DateTime From, DateTime To, decimal Interest)>();

                    foreach (var detail in fdDetails)
                    {
                        int interval = dto.IsMIS
                            ? (detail.InterestPaidInterval ?? detail.IntCompInterval)
                            : detail.IntCompInterval;

                        if (interval == (int)Enums.CompoundingInterval.NoCompounding) continue;

                        var lastPosted = await _context.voucherfddetail.AsNoTracking()
                            .Where(x => x.FDAccDetId == detail.Id && x.BrId == dto.BranchId && x.Operation == operation)
                            .OrderByDescending(x => x.VoucherDate)
                            .Select(x => (DateTime?)x.VoucherDate)
                            .FirstOrDefaultAsync();

                        DateTime cursor = lastPosted.HasValue
                            ? lastPosted.Value.Date.AddDays(1)
                            : detail.FDDate.Date;

                        while (true)
                        {
                            DateTime periodEnd = GetPeriodEnd(cursor, interval);
                            bool isPartial = false;

                            if (periodEnd > dto.PostingDate.Date)
                            {
                                if (dto.IsMIS) break; // MIS never posts partial periods
                                periodEnd = dto.PostingDate.Date;
                                isPartial = true;
                            }
                            if (periodEnd > detail.FDMaturityDate.Date) break;

                            int days = (periodEnd - cursor).Days + 1;
                            decimal interest = dto.IsMIS
                                ? Math.Round(detail.FDAmount * (detail.IntRate / 100m) * GetIntervalMonths(interval) / 12m, 0, MidpointRounding.AwayFromZero)
                                : Math.Round(detail.FDAmount * (detail.IntRate / 100m) * days / daysInYear, 0, MidpointRounding.AwayFromZero);

                            if (interest > 0)
                                periodPostings.Add((detail, cursor, periodEnd, interest));

                            if (isPartial) break;
                            cursor = periodEnd.AddDays(1);
                        }
                    }

                    if (!periodPostings.Any()) continue;

                    // Resolve effective per-period amounts (applying overrides proportionally)
                    var effectivePeriodAmts = new Dictionary<(int detId, DateTime periodEnd), decimal>();
                    foreach (var dg in periodPostings.GroupBy(p => p.Detail.Id))
                    {
                        var dgList = dg.ToList();
                        decimal calcDetTotal = dgList.Sum(p => p.Interest);
                        decimal effDetTotal = dto.InterestOverrides != null && dto.InterestOverrides.TryGetValue(dg.Key, out var dOvr2)
                            ? Math.Round(dOvr2, 0, MidpointRounding.AwayFromZero)
                            : calcDetTotal;
                        decimal dist = 0;
                        for (int pi = 0; pi < dgList.Count; pi++)
                        {
                            decimal periodCalc = dgList[pi].Interest;
                            decimal amt = pi == dgList.Count - 1
                                ? effDetTotal - dist
                                : (calcDetTotal > 0
                                    ? Math.Round(effDetTotal * periodCalc / calcDetTotal, 0, MidpointRounding.AwayFromZero)
                                    : Math.Round(effDetTotal / dgList.Count, 0, MidpointRounding.AwayFromZero));
                            dist += amt;
                            effectivePeriodAmts[(dgList[pi].Detail.Id, dgList[pi].To.Date)] = amt;
                        }
                    }

                    foreach (var (detail, from, to, calcInterest) in periodPostings)
                    {
                        decimal effAmt = effectivePeriodAmts.GetValueOrDefault((detail.Id, to.Date), calcInterest);
                        allPostings.Add((accountId, detail, from, to, effAmt));
                    }
                }

                if (!allPostings.Any())
                {
                    await transaction.RollbackAsync();
                    return "No accounts eligible for interest posting.";
                }

                decimal grandTotal = allPostings.Sum(p => p.EffAmt);
                if (grandTotal <= 0)
                {
                    await transaction.RollbackAsync();
                    return "No interest to post.";
                }

                // ONE voucher for all accounts
                int nextVrNo = await _commonFunctions.GetLatestVoucherNo(dto.BranchId, dto.PostingDate);
                var voucherEntity = new VoucherDTO
                {
                    ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate = voucherDate,
                    AddedBy = int.Parse(userIdClaim!),
                    BrID = dto.BranchId,
                    ModifiedBy = 0,
                    VerifiedBy = isAutoVerification ? int.Parse(userIdClaim!) : 0,
                    VoucherNarration = dto.IsMIS ? "MIS Interest Posting" : "FD Interest Posting",
                    OtherBrID = 0,
                    VoucherNo = nextVrNo,
                    VoucherStatus = voucherStatus,
                    VoucherType = (int)Enums.VoucherType.FD,
                    VoucherSubType = voucherSubType,
                };
                var voucherInfo = _memberService.MapToEntity(voucherEntity);
                await _context.voucher.AddAsync(voucherInfo);
                await _context.SaveChangesAsync();

                int row = 1;

                // ONE Dr: combined grand total interest expense
                long expHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(branchWise.IntExpenseAccount, dto.BranchId);
                var drEntry = _memberService.voucherCreditDebitDetails(
                    expHeadCode, branchWise.IntExpenseAccount, dto.BranchId,
                    Enums.VoucherStatus.Dr.ToString(),
                    dto.IsMIS ? "MIS Interest Posting" : "FD Interest Posting",
                    grandTotal, voucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                _context.vouchercreditdebitdetails.Add(drEntry);
                await _context.SaveChangesAsync();
                row++;

                if (dto.IsMIS)
                {
                    // Cr: one per unique MIS savings account across all FD accounts
                    var misGroups = allPostings
                        .Where(p => (p.Detail.MISAccId ?? 0) > 0)
                        .GroupBy(p => p.Detail.MISAccId ?? 0);

                    foreach (var grp in misGroups)
                    {
                        decimal grpTotal = grp.Sum(p => p.EffAmt);
                        long misHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(grp.Key, dto.BranchId);
                        var crEntry = _memberService.voucherCreditDebitDetails(
                            misHeadCode, grp.Key, dto.BranchId,
                            Enums.VoucherStatus.Cr.ToString(),
                            "MIS Interest Posting", grpTotal, voucherStatus,
                            valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(crEntry);
                        await _context.SaveChangesAsync();

                        foreach (var (accountId, detail, from, to, effAmt) in grp)
                        {
                            _context.voucherfddetail.Add(new VoucherFDDetail
                            {
                                BrId = dto.BranchId,
                                VoucherId = voucherInfo.Id,
                                VAccCrDrId = crEntry.Id,
                                FDAccId = accountId,
                                FDAccDetId = detail.Id,
                                AmountCr = effAmt,
                                AmountDr = 0,
                                Operation = operation,
                                ValueDate = DateTime.SpecifyKind(to, DateTimeKind.Unspecified),
                                VoucherDate = voucherDate,
                                IntCr = effAmt,
                                VoucherMainStatus = voucherStatus,
                            });
                        }
                        row++;
                    }
                }
                else
                {
                    // Cr: one per FD account (customer's account — interest compounds into balance)
                    var fdAccountGroups = allPostings.GroupBy(p => p.AccountId);

                    foreach (var grp in fdAccountGroups)
                    {
                        int accountId = grp.Key;
                        decimal accTotal = grp.Sum(p => p.EffAmt);
                        long fdAccHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(accountId, dto.BranchId);
                        var crEntry = _memberService.voucherCreditDebitDetails(
                            fdAccHeadCode, accountId, dto.BranchId,
                            Enums.VoucherStatus.Cr.ToString(),
                            "FD Interest Posting", accTotal, voucherStatus,
                            valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(crEntry);
                        await _context.SaveChangesAsync();

                        foreach (var (_, detail, from, to, effAmt) in grp)
                        {
                            _context.voucherfddetail.Add(new VoucherFDDetail
                            {
                                BrId = dto.BranchId,
                                VoucherId = voucherInfo.Id,
                                VAccCrDrId = crEntry.Id,
                                FDAccId = accountId,
                                FDAccDetId = detail.Id,
                                AmountCr = effAmt,
                                AmountDr = 0,
                                Operation = operation,
                                ValueDate = DateTime.SpecifyKind(to, DateTimeKind.Unspecified),
                                VoucherDate = voucherDate,
                                IntCr = effAmt,
                                VoucherMainStatus = voucherStatus,
                            });
                        }
                        row++;
                    }
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

        // ── Helper ────────────────────────────────────────────────────────────────

        private static DateTime GetPeriodEnd(DateTime from, int interval) =>
            interval switch
            {
                (int)Enums.CompoundingInterval.Daily => from,
                (int)Enums.CompoundingInterval.Monthly => from.AddMonths(1).AddDays(-1),
                (int)Enums.CompoundingInterval.Quarterly => from.AddMonths(3).AddDays(-1),
                (int)Enums.CompoundingInterval.Half_Yearly => from.AddMonths(6).AddDays(-1),
                (int)Enums.CompoundingInterval.Yearly => from.AddMonths(12).AddDays(-1),
                (int)Enums.CompoundingInterval.Two_Yearly => from.AddMonths(24).AddDays(-1),
                _ => from.AddMonths(1).AddDays(-1),
            };

        // MIS interest is a fixed amount per period (independent of days in the month).
        // Formula: Principal × Rate / 100 × periodMonths / 12
        private static int GetIntervalMonths(int interval) =>
            interval switch
            {
                (int)Enums.CompoundingInterval.Monthly => 1,
                (int)Enums.CompoundingInterval.Quarterly => 3,
                (int)Enums.CompoundingInterval.Half_Yearly => 6,
                (int)Enums.CompoundingInterval.Yearly => 12,
                (int)Enums.CompoundingInterval.Two_Yearly => 24,
                _ => 1,
            };
    }
}
