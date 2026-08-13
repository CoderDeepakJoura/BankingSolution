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
                        if (periodEnd > postingDate.Date) break;
                        if (periodEnd > detail.FDMaturityDate.Date) break;

                        int days = (periodEnd - cursor).Days + 1;
                        decimal interest = isMIS
                            ? Math.Round(detail.FDAmount * (detail.IntRate / 100m) * GetIntervalMonths(interval) / 12m, 0)
                            : Math.Round(detail.FDAmount * (detail.IntRate / 100m) * days / daysInYear, 0);

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

            int nextVrNo = await _commonFunctions.GetLatestVoucherNo(dto.BranchId, dto.PostingDate);
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

                foreach (var accountId in accountIdsToProcess)
                {
                    var fdDetailsQuery = _context.fdaccountdetail
                        .Where(x => x.AccountId == accountId && x.BranchId == dto.BranchId
                            && x.FDStatus == (int)Enums.FDStatus.Open
                            && x.FDMaturityDate.Date >= dto.PostingDate.Date);

                    // Filter to only the selected detail IDs when per-detail selection is active
                    if (dto.SelectedDetailIds != null && dto.SelectedDetailIds.Count > 0)
                        fdDetailsQuery = fdDetailsQuery.Where(x => dto.SelectedDetailIds.Contains(x.Id));

                    var fdDetails = await fdDetailsQuery.ToListAsync();

                    if (!fdDetails.Any()) continue;

                    // Collect all due period postings
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
                            if (periodEnd > dto.PostingDate.Date) break;
                            if (periodEnd > detail.FDMaturityDate.Date) break;

                            int days = (periodEnd - cursor).Days + 1;
                            decimal interest = dto.IsMIS
                                ? Math.Round(detail.FDAmount * (detail.IntRate / 100m) * GetIntervalMonths(interval) / 12m, 0)
                                : Math.Round(detail.FDAmount * (detail.IntRate / 100m) * days / daysInYear, 0);

                            if (interest > 0)
                                periodPostings.Add((detail, cursor, periodEnd, interest));

                            cursor = periodEnd.AddDays(1);
                        }
                    }

                    if (!periodPostings.Any()) continue;

                    // Overrides are keyed by fdDetailId; sum per-detail overridden amounts
                    decimal totalInterest;
                    if (dto.InterestOverrides != null && dto.InterestOverrides.Count > 0)
                    {
                        totalInterest = 0;
                        foreach (var dg in periodPostings.GroupBy(p => p.Detail.Id))
                            totalInterest += dto.InterestOverrides.TryGetValue(dg.Key, out var dOvr)
                                ? Math.Round(dOvr, 0)
                                : dg.Sum(p => p.Interest);
                    }
                    else
                    {
                        totalInterest = periodPostings.Sum(p => p.Interest);
                    }
                    if (totalInterest <= 0) continue;

                    // Pre-compute effective per-period amounts so voucherfddetail.AmountCr / IntCr
                    // stays in sync with the posted voucher Dr/Cr amount when an override is applied.
                    var effectivePeriodAmts = new Dictionary<(int detId, DateTime periodEnd), decimal>();
                    foreach (var dg in periodPostings.GroupBy(p => p.Detail.Id))
                    {
                        var dgList = dg.ToList();
                        decimal calcDetTotal = dgList.Sum(p => p.Interest);
                        decimal effDetTotal = dto.InterestOverrides != null && dto.InterestOverrides.TryGetValue(dg.Key, out var dOvr2)
                            ? Math.Round(dOvr2, 0)
                            : calcDetTotal;
                        decimal dist = 0;
                        for (int pi = 0; pi < dgList.Count; pi++)
                        {
                            decimal periodCalc = dgList[pi].Interest;
                            decimal amt = pi == dgList.Count - 1
                                ? effDetTotal - dist
                                : (calcDetTotal > 0
                                    ? Math.Round(effDetTotal * periodCalc / calcDetTotal, 0)
                                    : Math.Round(effDetTotal / dgList.Count, 0));
                            dist += amt;
                            effectivePeriodAmts[(dgList[pi].Detail.Id, dgList[pi].To.Date)] = amt;
                        }
                    }

                    // Create voucher
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

                    // Dr: interest expense GL
                    long expHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(branchWise.IntExpenseAccount, dto.BranchId);
                    var drEntry = _memberService.voucherCreditDebitDetails(
                        expHeadCode, branchWise.IntExpenseAccount, dto.BranchId,
                        Enums.VoucherStatus.Dr.ToString(),
                        dto.IsMIS ? "MIS Interest Posting" : "FD Interest Posting",
                        totalInterest, voucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    _context.vouchercreditdebitdetails.Add(drEntry);
                    await _context.SaveChangesAsync();
                    row++;

                    if (dto.IsMIS)
                    {
                        // Cr: each MIS saving account (grouped, in case multiple FD details point to different MIS accounts)
                        var misGroups = periodPostings
                            .GroupBy(p => p.Detail.MISAccId ?? 0)
                            .Where(g => g.Key > 0);

                        foreach (var grp in misGroups)
                        {
                            decimal grpInterest;
                            if (dto.InterestOverrides != null && dto.InterestOverrides.Count > 0)
                            {
                                grpInterest = 0;
                                foreach (var dg in grp.GroupBy(p => p.Detail.Id))
                                    grpInterest += dto.InterestOverrides.TryGetValue(dg.Key, out var dOvr)
                                        ? Math.Round(dOvr, 0)
                                        : dg.Sum(p => p.Interest);
                            }
                            else
                            {
                                grpInterest = grp.Sum(p => p.Interest);
                            }
                            long misHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(grp.Key, dto.BranchId);
                            var crEntry = _memberService.voucherCreditDebitDetails(
                                misHeadCode, grp.Key, dto.BranchId,
                                Enums.VoucherStatus.Cr.ToString(),
                                "MIS Interest Posting", grpInterest, voucherStatus,
                                valueDate, "Cr", voucherInfo.Id, row);
                            _context.vouchercreditdebitdetails.Add(crEntry);
                            await _context.SaveChangesAsync();

                            // Tag voucherfddetail entries for this MIS group
                            foreach (var (detail, from, to, interest) in grp)
                            {
                                decimal effAmt = effectivePeriodAmts.GetValueOrDefault((detail.Id, to.Date), interest);
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
                        // Cr: FD account (customer's FD account — interest compounds into balance)
                        long fdAccHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(accountId, dto.BranchId);
                        var crEntry = _memberService.voucherCreditDebitDetails(
                            fdAccHeadCode, accountId, dto.BranchId,
                            Enums.VoucherStatus.Cr.ToString(),
                            "FD Interest Posting", totalInterest, voucherStatus,
                            valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(crEntry);
                        await _context.SaveChangesAsync();

                        // Tag voucherfddetail entries — each period posting
                        foreach (var (detail, from, to, interest) in periodPostings)
                        {
                            decimal effAmt = effectivePeriodAmts.GetValueOrDefault((detail.Id, to.Date), interest);
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
                    }

                    await _context.SaveChangesAsync();
                    nextVrNo++;
                }

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
