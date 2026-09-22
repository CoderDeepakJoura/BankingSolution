using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.Infrastructure.Models.AccMasters.Loan;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Vouchers.Loan
{
    public class LoanInterestPostingService
    {
        private readonly BankingDbContext _db;
        private readonly CommonFunctions _cf;
        private readonly LoanRecoveryVoucherService _recoveryService;

        private const int CAT_STD    = (int)Enums.IntCategory.StdInterest;
        private const int CAT_PENAL  = (int)Enums.IntCategory.PenalInterest;
        private const int CAT_STDREC = LoanRecoveryVoucherService.CAT_STDREC;
        private const int CAT_OVDREC = LoanRecoveryVoucherService.CAT_OVDREC;

        public LoanInterestPostingService(BankingDbContext db, CommonFunctions cf, LoanRecoveryVoucherService recoveryService)
        {
            _db = db;
            _cf = cf;
            _recoveryService = recoveryService;
        }

        // ── Search ───────────────────────────────────────────────────────────────

        public async Task<List<LoanAccountSearchDTO>> SearchLoanAccountsAsync(int branchId, string query, int? productId = null)
        {
            var q = query.Trim().ToLower();
            return await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                         && x.AccTypeId == (int)Enums.AccountTypes.Loan
                         && x.IsAccClosed != true
                         && (!productId.HasValue || x.GeneralProductId == productId)
                         && (x.AccountNumber.ToLower().Contains(q)
                             || (x.AccountName != null && x.AccountName.ToLower().Contains(q))))
                .OrderBy(x => x.AccountNumber)
                .Take(20)
                .Select(x => new LoanAccountSearchDTO
                {
                    AccountId     = x.ID,
                    AccountNumber = x.AccountNumber,
                    AccountName   = x.AccountName ?? "",
                    MemberId      = x.MemberId,
                })
                .ToListAsync();
        }

        // ── Postable Interest Info ────────────────────────────────────────────────

        public async Task<LoanInterestPostingInfoDTO?> GetPostableInterestAsync(int loanAccId, int branchId, DateTime? asOfDate = null)
        {
            var bal = await _recoveryService.GetLoanBalanceAsync(loanAccId, branchId, asOfDate);
            if (bal == null) return null;

            return new LoanInterestPostingInfoDTO
            {
                LoanAccId              = bal.LoanAccId,
                AccountNumber          = bal.AccountNumber,
                MemberName             = bal.MemberName,
                MemberRelativeName     = bal.MemberRelativeName,
                PhoneNo                = bal.PhoneNo,
                LoanNo                 = bal.LoanNo,
                LoanDate               = bal.LoanDate,
                StandardInterestRate   = bal.StandardInterestRate,
                OverdueInterestRate    = bal.OverdueInterestRate,
                PrincipalBalance       = bal.PrincipalBalance,
                UnpostedStdInterest    = Math.Round(bal.StdInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                UnpostedPenalInterest  = Math.Round(bal.PenalInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                TotalPostable          = Math.Round(bal.StdInterestOutstanding + bal.PenalInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                InterestCalcFromDate   = bal.InterestCalcFromDate,
                InterestCalcToDate     = bal.InterestCalcToDate,
                IntCalcMethod          = bal.IntCalcMethod,
                ActOnIntPosting        = bal.ActOnIntPosting,
                OverdueInstallments    = bal.OverdueInstallments,
                OverduePrincipal       = bal.OverduePrincipal,
                PenalBreakdown         = bal.PenalBreakdown,
            };
        }

        // ── Post Interest ─────────────────────────────────────────────────────────

        public async Task<(string result, int voucherNo)> PostInterestAsync(LoanInterestPostingVoucherDTO dto)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (dto.LoanAccountId <= 0)
                    return ("Invalid loan account.", 0);

                decimal stdAmt   = Math.Round(dto.StdInterestAmount, 0, MidpointRounding.AwayFromZero);
                decimal penalAmt = Math.Round(dto.PenalInterestAmount, 0, MidpointRounding.AwayFromZero);
                decimal total    = stdAmt + penalAmt;

                if (total <= 0)
                    return ("No interest amount to post.", 0);

                // Fetch account info (needed for account head resolution below)
                var info = await GetPostableInterestAsync(dto.LoanAccountId, dto.BrId, dto.VoucherDate);
                if (info == null)
                    return ("Loan account not found.", 0);
                bool isAddInBalance = info.ActOnIntPosting == 1;

                // ── Voucher header ────────────────────────────────────────────────
                int nextVrNo    = await _cf.GetLatestVoucherNo(dto.BrId, dto.VoucherDate);
                bool autoVerify = await _cf.IsAutoVerification(dto.BrId);
                string vrStatus = autoVerify ? "V" : "A";
                int userId      = int.Parse(_cf.GetCurrentUserId()!);
                DateTime vrDate  = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narr      = string.IsNullOrWhiteSpace(dto.Narration)
                    ? $"Loan Interest Posting - {dto.VoucherDate:dd-MMM-yyyy}"
                    : dto.Narration;

                var voucher = new Voucher
                {
                    BrID             = dto.BrId,
                    VoucherNo        = nextVrNo,
                    VoucherType      = (int)Enums.VoucherType.Loan,
                    VoucherSubType   = (int)Enums.VoucherSubType.InterestPosting,
                    VoucherDate      = vrDate,
                    ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherNarration = narr,
                    VoucherStatus    = vrStatus,
                    AddedBy          = userId,
                    ModifiedBy       = 0,
                    VerifiedBy       = autoVerify ? userId : 0,
                    OtherBrID        = 0,
                };
                await _db.voucher.AddAsync(voucher);
                await _db.SaveChangesAsync();
                int voucherId = voucher.Id;

                // ── Resolve account heads ─────────────────────────────────────────
                long loanHead = await _cf.GetAccountHeadCodeFromAccId(dto.LoanAccountId, dto.BrId);

                var acc = await _db.accountmaster.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ID == dto.LoanAccountId && x.BranchId == dto.BrId);

                int  intIncomeAccId  = 0;
                long intIncomeHead   = 0;
                int  currentRecAccId = 0;
                long currentRecHead  = 0;
                if (acc?.GeneralProductId.HasValue == true)
                {
                    var rule = await _cf.GetLoanProductBranchWiseRuleInfo(dto.BrId, acc.GeneralProductId.Value);
                    if (rule.IntIncomeAcc.HasValue && rule.IntIncomeAcc.Value > 0)
                    {
                        intIncomeAccId = rule.IntIncomeAcc.Value;
                        intIncomeHead  = await _cf.GetAccountHeadCodeFromAccId(intIncomeAccId, dto.BrId);
                    }
                    if (!isAddInBalance && rule.CurrentRecoverableIntAcc.HasValue && rule.CurrentRecoverableIntAcc.Value > 0)
                    {
                        currentRecAccId = rule.CurrentRecoverableIntAcc.Value;
                        currentRecHead  = await _cf.GetAccountHeadCodeFromAccId(currentRecAccId, dto.BrId);
                    }
                }

                // ── VoucherCreditDebitDetails ─────────────────────────────────────
                int row = 1;

                // Stand: Dr = CurrentRecoverableIntAcc; AddInBalance: Dr = loan account (LInterest)
                bool useRecAcc = !isAddInBalance && currentRecAccId > 0;
                int  drAccIdSingle = useRecAcc ? currentRecAccId : dto.LoanAccountId;
                long drHeadSingle  = useRecAcc ? currentRecHead  : loanHead;

                var drEntry = new VoucherCreditDebitDetails
                {
                    BrId             = dto.BrId,
                    VoucherID        = voucherId,
                    AccountId        = drAccIdSingle,
                    AccHeadCode      = drHeadSingle,
                    VoucherAmount    = total,
                    VoucherEntryType = "Dr",
                    EntryStatus      = useRecAcc ? "Dr" : "LInterest",
                    Narration        = narr,
                    VoucherStatus    = vrStatus,
                    ValueDate        = valDate,
                    VoucherSeqNo     = row,
                    IntDr            = useRecAcc ? (decimal?)null : total,
                    IntCr            = null,
                    ExpenseAmt       = 0,
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await _db.vouchercreditdebitdetails.AddAsync(drEntry);
                await _db.SaveChangesAsync();
                int ipEntryId = drEntry.Id;
                row++;

                // Cr: Interest Income account — falls back to loan account if not configured
                int  crAccId = intIncomeAccId > 0 ? intIncomeAccId : dto.LoanAccountId;
                long crHead  = intIncomeHead  > 0 ? intIncomeHead  : loanHead;

                await _db.vouchercreditdebitdetails.AddAsync(new VoucherCreditDebitDetails
                {
                    BrId             = dto.BrId,
                    VoucherID        = voucherId,
                    AccountId        = crAccId,
                    AccHeadCode      = crHead,
                    VoucherAmount    = total,
                    VoucherEntryType = "Cr",
                    EntryStatus      = Enums.VoucherStatus.Cr.ToString(),
                    Narration        = narr,
                    VoucherStatus    = vrStatus,
                    ValueDate        = valDate,
                    VoucherSeqNo     = row,
                    IntDr = null, IntCr = null, ExpenseAmt = 0,
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                });
                row++;

                // ── VoucherRecIntDetail ───────────────────────────────────────────
                // Cat 1/2: IntDr = IntCr = amount for both AiB and Stand (interest recorded and accounted for).
                // Cat 3 (Stand only): IntDr = total, IntCr = 0 — tracks outstanding recoverable interest.
                if (stdAmt > 0)
                {
                    await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                    {
                        BrId              = dto.BrId,
                        VAccCrDrId        = ipEntryId,
                        VoucherId         = voucherId,
                        VoucherNo         = nextVrNo,
                        EntryDate         = vrDate,
                        ValueDate         = valDate,
                        IntCatId          = CAT_STD,
                        Pamt              = (double)info.PrincipalBalance,
                        AccId             = dto.LoanAccountId,
                        IntDr             = (double)stdAmt,
                        IntCr             = (double)stdAmt,
                        VoucherMainStatus = vrStatus,
                    });
                }

                if (penalAmt > 0)
                {
                    await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                    {
                        BrId              = dto.BrId,
                        VAccCrDrId        = ipEntryId,
                        VoucherId         = voucherId,
                        VoucherNo         = nextVrNo,
                        EntryDate         = vrDate,
                        ValueDate         = valDate,
                        IntCatId          = CAT_PENAL,
                        Pamt              = (double)info.PrincipalBalance,
                        AccId             = dto.LoanAccountId,
                        IntDr             = (double)penalAmt,
                        IntCr             = (double)penalAmt,
                        VoucherMainStatus = vrStatus,
                    });
                }

                if (!isAddInBalance)
                {
                    await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                    {
                        BrId              = dto.BrId,
                        VAccCrDrId        = ipEntryId,
                        VoucherId         = voucherId,
                        VoucherNo         = nextVrNo,
                        EntryDate         = vrDate,
                        ValueDate         = valDate,
                        IntCatId          = CAT_STDREC,
                        Pamt              = (double)info.PrincipalBalance,
                        AccId             = dto.LoanAccountId,
                        IntDr             = (double)total,
                        IntCr             = 0,
                        VoucherMainStatus = vrStatus,
                    });
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return ("Success", nextVrNo);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return (ex.Message, 0);
            }
        }

        // ── Batch Calculate ───────────────────────────────────────────────────────
        // Pre-fetches all data in ~9 bulk queries then computes entirely in-memory.
        // Scales to thousands of accounts without the N+1 query problem.

        public async Task<List<LoanInterestBatchItemDTO>> BatchCalculateInterestAsync(int brId, int productId, int? accountId, DateTime? asOfDate = null)
        {
            DateTime today = (asOfDate ?? DateTime.Today).Date;

            // ── 1. All accounts for this product ──────────────────────────────────
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == brId
                         && x.GeneralProductId == productId
                         && x.AccTypeId == (int)Enums.AccountTypes.Loan
                         && x.IsAccClosed != true
                         && (!accountId.HasValue || x.ID == accountId.Value))
                .OrderBy(x => x.AccountNumber)
                .Select(x => new { x.ID, x.AccountNumber, x.MemberId, x.MemberBranchID })
                .ToListAsync();

            if (!accounts.Any()) return new List<LoanInterestBatchItemDTO>();

            var accountIds = accounts.Select(a => a.ID).ToList();

            // ── 2. Bulk pre-fetch (sequential — EF Core DbContext is not thread-safe) ──
            // 9 queries total regardless of account count vs ~13 per account previously.

            // Product-level data (same for every account in this batch)
            var prodDef = await _db.loanproductdefinition.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductId == productId && x.BrId == brId);
            var prodRec = await _db.loanproductrecovery.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductId == productId && x.BrId == brId);

            // LimitWise (TypeId=4): rates live in accountlimitdetail, not accountkistdetail
            const int LOAN_TYPE_LIMITWISE = 4;
            bool isLimitWise = prodDef?.TypeId == LOAN_TYPE_LIMITWISE;
            var limitDetailMap = new Dictionary<int, AccountLimitDetail>();
            if (isLimitWise)
            {
                var limitAll = await _db.accountlimitdetail.AsNoTracking()
                    .Where(x => accountIds.Contains(x.AccountId) && x.BrId == brId)
                    .OrderByDescending(x => x.LoanDate)
                    .ToListAsync();
                limitDetailMap = limitAll.GroupBy(x => x.AccountId).ToDictionary(g => g.Key, g => g.First());
            }

            // Kist detail — latest row per account (ordered desc; first per group wins)
            var kistAll = await _db.accountkistdetail.AsNoTracking()
                .Where(x => accountIds.Contains(x.AccountId) && x.BrId == brId)
                .OrderByDescending(x => x.LoanDate)
                .ToListAsync();

            // Members (by Id only; single-branch banks have unique member Ids)
            var memberIds = accounts.Where(a => a.MemberId.HasValue).Select(a => a.MemberId!.Value).Distinct().ToList();
            var memberMap = memberIds.Any()
                ? await _db.member.AsNoTracking().Where(x => memberIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id)
                : new Dictionary<int, BankingPlatform.Infrastructure.Models.member.Member>();

            var obMap = await _db.loanaccopeningbalance.AsNoTracking()
                .Where(x => x.AccId != null && accountIds.Contains((int)x.AccId) && x.BranchId == brId)
                .ToDictionaryAsync(x => (int)x.AccId!);

            var obDetailAll = await _db.loanaccountbalancedetail.AsNoTracking()
                .Where(x => accountIds.Contains(x.AccountId) && x.BrId == brId)
                .ToListAsync();

            // All VCDD (LA / LR / LInterest) — principal calc + day-weighted interest
            var vcddRaw = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => accountIds.Contains(x.AccountId) && x.BrId == brId
                         && (x.EntryStatus == "LA" || x.EntryStatus == "LR" || x.EntryStatus == "LInterest")
                         && (x.VoucherStatus == "V" || x.VoucherStatus == "A"))
                .OrderBy(x => x.ValueDate).ThenBy(x => x.VoucherID)
                .Select(x => new { x.AccountId, x.EntryStatus, x.VoucherAmount, x.IntDr, x.IntCr, x.ValueDate })
                .ToListAsync();

            // VoucherRecIntDetail (interest ledger — Stand loans and AddInBalance IP dates)
            var intEntriesAll = await _db.voucherrecintdetail.AsNoTracking()
                .Where(x => accountIds.Contains(x.AccId) && x.BrId == brId)
                .OrderBy(x => x.EntryDate).ThenBy(x => x.Id)
                .ToListAsync();

            // Kist schedules
            var schedAll = await _db.accountkistschedule.AsNoTracking()
                .Where(x => x.LoanAccId != null && accountIds.Contains((int)x.LoanAccId))
                .OrderBy(x => x.KistNumber)
                .ToListAsync();

            // Slab details for accounts whose OverdueInterestRate = 0 but have a slab configured.
            // Mirrors the slab-fallback logic in GetLoanBalanceAsync.
            var slabIds = kistAll
                .Where(k => (k.OverdueInterestRate ?? 0) == 0 && (k.SlabId ?? 0) > 0)
                .Select(k => k.SlabId!.Value).Distinct().ToList();
            var slabDetailsAll = slabIds.Any()
                ? await _db.loanslabdetail.AsNoTracking()
                    .Where(x => slabIds.Contains(x.SlabId) && x.PenalIntRate > 0)
                    .ToListAsync()
                : new List<BankingPlatform.Infrastructure.Models.InterestSlabs.Loan.LoanSlabDetail>();

            // First session start date for this branch — interest never starts before this date because
            // the user has already entered opening balance + opening interest up to (firstSessionFrom - 1).
            var firstSession = await _db.branchsession.AsNoTracking()
                .Where(s => s.branchid == brId && s.isfirst)
                .Select(s => (DateTime?)s.fromdate)
                .FirstOrDefaultAsync();

            // Build lookup maps
            var kistMap      = kistAll.GroupBy(x => x.AccountId).ToDictionary(g => g.Key, g => g.First());
            var obDetailMap  = obDetailAll.GroupBy(x => x.AccountId).ToDictionary(g => g.Key, g => g.ToList());
            // Project VCDD to VcddEvent keyed by AccountId (ordering preserved from query)
            var vcddByAcc    = vcddRaw
                .GroupBy(x => x.AccountId)
                .ToDictionary(g => g.Key,
                    g => (IReadOnlyList<VcddEvent>)g.Select(x => new VcddEvent(x.EntryStatus, x.VoucherAmount, x.IntDr, x.IntCr, x.ValueDate)).ToList());
            var intEntrMap   = intEntriesAll.GroupBy(x => x.AccId).ToDictionary(g => g.Key, g => g.ToList());
            var schedMap     = schedAll.GroupBy(x => (int)x.LoanAccId!).ToDictionary(g => g.Key, g => g.ToList());

            // Product-level constants (identical for all accounts in this batch)
            string intCalcMethod = !string.IsNullOrWhiteSpace(prodDef?.IntCalcMethod) ? prodDef.IntCalcMethod : "Schedule";
            int? actOnIntPosting = prodDef?.ActOnIntPosting;
            bool isAddInBalance  = actOnIntPosting == 1;

            // ── 3. Per-account computation — zero DB queries ──────────────────────
            var result = new List<LoanInterestBatchItemDTO>();

            foreach (var acc in accounts)
            {
                kistMap.TryGetValue(acc.ID, out var kist);
                limitDetailMap.TryGetValue(acc.ID, out var limitDetail);
                memberMap.TryGetValue(acc.MemberId ?? 0, out var member);
                obMap.TryGetValue(acc.ID, out var ob);
                var obDetails    = obDetailMap.GetValueOrDefault(acc.ID) ?? new List<BankingPlatform.Infrastructure.Models.AccMasters.Loan.LoanAccountBalanceDetail>();
                var vcdd         = vcddByAcc.GetValueOrDefault(acc.ID) ?? Array.Empty<VcddEvent>();
                var intEntries   = intEntrMap.GetValueOrDefault(acc.ID) ?? new List<BankingPlatform.Infrastructure.Models.voucher.VoucherRecIntDetail>();
                var kistSchedule = schedMap.GetValueOrDefault(acc.ID) ?? new List<BankingPlatform.Infrastructure.Models.AccMasters.Loan.AccountKistSchedule>();

                // Principal balance (mirrors GetLoanBalanceAsync logic exactly)
                decimal advancedTotal   = vcdd.Where(x => x.EntryStatus == "LA").Sum(x => x.VoucherAmount);
                decimal recoveredTotal  = vcdd.Where(x => x.EntryStatus == "LR").Sum(x => x.VoucherAmount);
                decimal lInterestPosted = isAddInBalance ? vcdd.Where(x => x.EntryStatus == "LInterest").Sum(x => x.VoucherAmount) : 0m;

                decimal openingPrincipal = ob?.TotalBalance ?? 0m;
                // loanaccountbalancedetail is a bifurcation of TotalBalance — only add it when TotalBalance is absent
                // to avoid double-counting.
                decimal obDetailPrincipalAdj = (ob == null || (ob.TotalBalance ?? 0m) == 0m)
                    ? (obDetails.Sum(x => x.AmountDr) - obDetails.Sum(x => x.AmountCr))
                    : 0m;
                decimal principalBal = openingPrincipal + obDetailPrincipalAdj + advancedTotal - recoveredTotal;
                if (isAddInBalance)
                {
                    decimal obDetailIntAdj = (ob == null || (ob.TotalBalance ?? 0m) == 0m)
                        ? (obDetails.Sum(x => x.IntDr) - obDetails.Sum(x => x.IntCr))
                        : 0m;
                    principalBal += obDetailIntAdj + lInterestPosted;
                }
                principalBal = Math.Max(0, principalBal);

                string memberName = member?.MemberName ?? "";
                string? memberRel = member?.RelativeName;

                // ── AddInBalance path ─────────────────────────────────────────────
                if (isAddInBalance)
                {
                    DateTime? lastIpDate = intEntries.Any() ? intEntries.Max(x => (DateTime?)x.EntryDate) : null;
                    DateTime aibTo   = today;
                    DateTime aibFrom = (lastIpDate?.Date ?? kist?.LoanDate) ?? aibTo;
                    int days = Math.Max(0, (aibTo - aibFrom.Date).Days);

                    decimal aibStdInt = 0m;
                    if (days > 0 && principalBal > 0 && (kist?.StandardInterestRate ?? 0) > 0)
                    {
                        decimal rate = (decimal)kist!.StandardInterestRate!.Value;
                        if (intCalcMethod == "Schedule")
                        {
                            var schedKists = kistSchedule
                                .Where(x => x.Date.HasValue && x.Date.Value.Date > aibFrom.Date && x.Date.Value.Date <= aibTo)
                                .ToList();
                            aibStdInt = schedKists.Sum(x => x.InterestAmt ?? 0m);
                            if (aibStdInt == 0)
                                aibStdInt = Math.Round(principalBal * rate / 100m * days / 365m, 0, MidpointRounding.AwayFromZero);
                        }
                        else
                        {
                            aibStdInt = Math.Round(principalBal * rate / 100m * days / 365m, 0, MidpointRounding.AwayFromZero);
                        }
                    }

                    result.Add(new LoanInterestBatchItemDTO
                    {
                        LoanAccId           = acc.ID,
                        AccountNumber       = acc.AccountNumber,
                        MemberName          = memberName,
                        MemberRelativeName  = memberRel,
                        PrincipalBalance    = principalBal,
                        StdInterest         = Math.Round(aibStdInt, 0, MidpointRounding.AwayFromZero),
                        PenalInterest       = 0m,
                        StdRecoverable      = 0m,
                        TotalPostable       = Math.Round(aibStdInt, 0, MidpointRounding.AwayFromZero),
                        CalcFromDate        = aibFrom,
                        CalcToDate          = (DateTime?)aibTo,
                        StdInterestRate     = kist?.StandardInterestRate,
                        OverdueInterestRate = kist?.OverdueInterestRate,
                        IntCalcMethod       = intCalcMethod,
                        ActOnIntPosting     = actOnIntPosting,
                        NoInterestReason    = aibStdInt == 0 ? "No interest accrued yet" : null,
                    });
                    continue;
                }

                // ── Stand loan path ───────────────────────────────────────────────
                // LimitWise: std and overdue rates come from accountlimitdetail, not accountkistdetail.
                double effectiveStdRate = kist?.StandardInterestRate ?? 0;
                double effectiveOvdRate = kist?.OverdueInterestRate ?? 0;
                DateTime? limitLoanDate = null;
                if (isLimitWise && limitDetail != null)
                {
                    if (effectiveStdRate == 0) effectiveStdRate = limitDetail.StandardInterestRate;
                    if (effectiveOvdRate == 0) effectiveOvdRate = limitDetail.OverdueInterestRate;
                    limitLoanDate = limitDetail.LoanDate;
                }
                // Slab fallback: if account's own rate is 0 but a slab is configured, use it.
                if (effectiveOvdRate == 0 && (kist?.SlabId ?? 0) > 0)
                {
                    decimal loanAmt    = (decimal)(kist!.LoanAmountPassed ?? 0);
                    int     loanPeriod = kist.LoanPeriod ?? 0;
                    var sd = slabDetailsAll.FirstOrDefault(x => x.SlabId == kist.SlabId!.Value
                        && x.FromAmount <= loanAmt && x.ToAmount >= loanAmt
                        && (x.PeriodFrom == null || x.PeriodFrom <= loanPeriod)
                        && (x.PeriodTo   == null || x.PeriodTo   >= loanPeriod));
                    if ((sd?.PenalIntRate ?? 0) > 0)
                        effectiveOvdRate = sd!.PenalIntRate!.Value;
                }
                decimal openStdInt  = (ob?.OpenInt > 0 && ob!.OpenIntType == "Dr")    ? (decimal)ob.OpenInt!.Value    : 0m;
                decimal openOvdInt  = (ob?.OpenOverInt > 0 && ob!.OpenOverIntType == "Dr") ? (decimal)ob.OpenOverInt!.Value : 0m;

                decimal postedStdInt    = (decimal)intEntries.Where(x => x.IntCatId == CAT_STD).Sum(x => x.IntDr);
                decimal postedPenalInt  = (decimal)intEntries.Where(x => x.IntCatId == CAT_PENAL).Sum(x => x.IntDr);
                decimal totalPosted     = postedStdInt + postedPenalInt;
                decimal postedRecovered = (decimal)intEntries.Where(x => x.IntCatId == CAT_STDREC).Sum(x => x.IntCr);
                decimal cat3Dr          = (decimal)intEntries.Where(x => x.IntCatId == CAT_STDREC).Sum(x => x.IntDr);
                decimal unpostedRecStd  = (decimal)intEntries.Where(x => x.IntCatId == CAT_STD).Sum(x => x.IntCr);
                decimal unpostedRecPenal= (decimal)intEntries.Where(x => x.IntCatId == CAT_PENAL).Sum(x => x.IntCr);
                decimal ovdRecPosted    = (decimal)intEntries.Where(x => x.IntCatId == CAT_OVDREC).Sum(x => x.IntDr);
                decimal ovdRecRecovered = (decimal)intEntries.Where(x => x.IntCatId == CAT_OVDREC).Sum(x => x.IntCr);
                // cat3Dr handles new-style Stand IP entries (Cat3.IntDr = posted recoverable);
                // backward-compat: old Stand entries have no Cat3, so cat3Dr=0 and formula falls back to old behaviour.
                decimal stdRec = Math.Max(0, totalPosted + openStdInt + cat3Dr - postedRecovered - unpostedRecStd - unpostedRecPenal);
                decimal ovdRec = Math.Max(0, ovdRecPosted + openOvdInt - ovdRecRecovered);

                var overdueKists = kistSchedule.Where(x => x.Date.HasValue && x.Date.Value.Date < today).ToList();
                int overdueInstallments = overdueKists.Count;
                decimal overduePrincipal = overdueKists.Sum(x => x.PrincipalAmt ?? Math.Max(0m, (x.KistAmount ?? 0m) - (x.InterestAmt ?? 0m)));
                // For interest computation, only count kists due on or after the first session start.
                // Pre-session kist interest is already captured in openStdInt / openOvdInt (opening balance entries).
                var interestOverdueKists = firstSession.HasValue
                    ? overdueKists.Where(x => x.Date!.Value.Date >= firstSession.Value.Date).ToList()
                    : overdueKists;

                // Detect accounts whose entire kist schedule expired before the first session.
                // These have no standard balance — every rupee is overdue; no DWI std interest should post.
                bool allKistsPreSession = firstSession.HasValue
                    && kistSchedule.Any()
                    && kistSchedule.All(k => !k.Date.HasValue || k.Date.Value.Date < firstSession.Value.Date);

                // Old Stand IP: Cat1/2 IntCr=0. New Stand IP: Cat1/2 IntCr=IntDr but a Cat3 entry exists for same VoucherId.
                var ipVoucherIds = intEntries.Where(x => x.IntCatId == CAT_STDREC).Select(x => x.VoucherId).ToHashSet();
                DateTime? lastPostDate = intEntries.Any(x => (x.IntCatId == CAT_STD || x.IntCatId == CAT_PENAL)
                        && (x.IntCr == 0 || ipVoucherIds.Contains(x.VoucherId)))
                    ? intEntries.Where(x => (x.IntCatId == CAT_STD || x.IntCatId == CAT_PENAL)
                            && (x.IntCr == 0 || ipVoucherIds.Contains(x.VoucherId)))
                        .Max(x => (DateTime?)x.EntryDate)
                    : null;

                DateTime calcFromDate = lastPostDate?.Date ?? kist?.LoanDate ?? limitLoanDate ?? ob?.OverDueDate ?? today;
                // If the account predates the first session, clamp to the session start.
                // Opening balance + opening interest already cover everything before that date.
                if (firstSession.HasValue && calcFromDate.Date < firstSession.Value.Date)
                    calcFromDate = firstSession.Value.Date;
                DateTime calcToDate   = today;
                // For AddInBalance loans, posted interest is capitalised into the principal, so
                // opening std interest is part of the outstanding balance and included in DWI base.
                // For standard loans, opening interest is tracked separately (Cat 1) and collected
                // via loan recovery — do NOT inflate the DWI base with it.
                decimal obNetForDWI   = openingPrincipal + obDetailPrincipalAdj + (isAddInBalance ? openStdInt : 0m);

                decimal dynStdInt   = 0m;
                decimal dynPenalInt = 0m;
                List<InterestCalcSegmentDTO>? calcSegments = null;
                List<PenalBreakdownItemDTO>? penalBreakdown = null;

                // Penal helper — shared by Schedule and Balance/MinBalance branches below
                void ComputePenal(bool requireOverdueKists)
                {
                    if (effectiveOvdRate <= 0 || principalBal <= 0) return;
                    // requireOverdueKists: at least ONE kist must be overdue (any, pre- or post-session)
                    if (requireOverdueKists && !overdueKists.Any()) return;
                    decimal rawPenal = 0m;
                    penalBreakdown = new List<PenalBreakdownItemDTO>();
                    if (interestOverdueKists.Any())
                    {
                        // Post-session overdue kists: break down penal per kist.
                        // +1 to match the Period Detail's inclusive-end-date day count convention.
                        bool hasPerKist = interestOverdueKists.Any(x => (x.PrincipalAmt ?? 0m) > 0 || (x.KistAmount ?? 0m) > 0);
                        if (hasPerKist)
                        {
                            foreach (var ok in interestOverdueKists)
                            {
                                if (ok.Date == null) continue;
                                decimal kp = ok.PrincipalAmt ?? Math.Max(0m, (ok.KistAmount ?? 0m) - (ok.InterestAmt ?? 0m));
                                if (kp <= 0 && principalBal > 0) kp = principalBal / interestOverdueKists.Count;
                                int pd = Math.Max(0, (today - ok.Date.Value.Date).Days + 1);
                                decimal pi = Math.Round(kp * (decimal)effectiveOvdRate / 100m * pd / 365m, 2);
                                rawPenal += pi;
                                penalBreakdown.Add(new PenalBreakdownItemDTO { KistNumber = ok.KistNumber ?? 0, DueDate = ok.Date.Value.Date, PrincipalAmount = kp, DaysOverdue = pd, OverdueRate = effectiveOvdRate, PenalInterest = pi });
                            }
                        }
                        else
                        {
                            var firstOvd = interestOverdueKists.Where(x => x.Date.HasValue).Min(x => x.Date!.Value.Date);
                            int pd = Math.Max(0, (today - firstOvd).Days + 1);
                            rawPenal = Math.Round(principalBal * (decimal)effectiveOvdRate / 100m * pd / 365m, 2);
                            penalBreakdown.Add(new PenalBreakdownItemDTO { KistNumber = 0, DueDate = firstOvd, PrincipalAmount = principalBal, DaysOverdue = pd, OverdueRate = effectiveOvdRate, PenalInterest = rawPenal });
                        }
                    }
                    else if (overdueKists.Any())
                    {
                        // All overdue kists are pre-session — the account's full schedule has expired.
                        // Charge penal on the outstanding principal from the first session start date (+1 inclusive).
                        DateTime fromDate = firstSession.HasValue ? firstSession.Value.Date : overdueKists.Min(x => x.Date!.Value.Date);
                        int pd = Math.Max(0, (today - fromDate).Days + 1);
                        rawPenal = Math.Round(principalBal * (decimal)effectiveOvdRate / 100m * pd / 365m, 2);
                        penalBreakdown.Add(new PenalBreakdownItemDTO { KistNumber = 0, DueDate = fromDate, PrincipalAmount = principalBal, DaysOverdue = pd, OverdueRate = effectiveOvdRate, PenalInterest = rawPenal });
                    }
                    else if (kist != null && kist.KistFirstDate.Date < today)
                    {
                        DateTime kistFirstClamped = kist.KistFirstDate.Date;
                        if (firstSession.HasValue && kistFirstClamped < firstSession.Value.Date)
                            kistFirstClamped = firstSession.Value.Date;
                        int pd = Math.Max(0, (today - kistFirstClamped).Days + 1);
                        rawPenal = Math.Round(principalBal * (decimal)effectiveOvdRate / 100m * pd / 365m, 2);
                        penalBreakdown.Add(new PenalBreakdownItemDTO { KistNumber = 1, DueDate = kist.KistFirstDate.Date, PrincipalAmount = principalBal, DaysOverdue = pd, OverdueRate = effectiveOvdRate, PenalInterest = rawPenal });
                    }
                    dynPenalInt = Math.Max(0, rawPenal - postedPenalInt);
                }

                if (intCalcMethod == "Schedule" && kistSchedule.Any())
                {
                    // Opening interest (openStdInt) is already tracked as Cat 1 and collected via
                    // loan recovery — do NOT include it here. Only post NEW interest from the
                    // post-session kist schedule.
                    decimal schedIntDue = interestOverdueKists.Sum(x => x.InterestAmt ?? 0m);
                    decimal schedBasedInt = Math.Max(0, schedIntDue - postedStdInt);
                    dynStdInt = schedBasedInt;

                    // Always compute the schedule-aware DWI and take max(schedBased, dwiBased).
                    // This ensures heavily-overdue loans whose kist schedule InterestAmt is stale
                    // (e.g. ₹10 contractual vs ₹696 actual accrual) still post the correct amount.
                    // For normal loans the two values are close and max is harmless.
                    if (effectiveStdRate > 0 && principalBal > 0 && !allKistsPreSession)
                    {
                        var schedPts = new List<DateTime> { calcFromDate };
                        foreach (var kd in kistSchedule
                            .Where(k => k.Date.HasValue
                                && k.Date.Value.Date > calcFromDate
                                && k.Date.Value.Date < calcToDate
                                && (!firstSession.HasValue || k.Date.Value.Date >= firstSession.Value.Date))
                            .Select(k => k.Date!.Value.Date)
                            .Distinct()
                            .OrderBy(d => d))
                        {
                            schedPts.Add(kd);
                        }
                        schedPts.Add(calcToDate);

                        calcSegments = new List<InterestCalcSegmentDTO>();
                        decimal wInt = 0m;
                        for (int ci = 1; ci < schedPts.Count; ci++)
                        {
                            DateTime segFrom = schedPts[ci - 1];
                            DateTime segTo   = schedPts[ci];
                            bool isFinalSeg  = ci == schedPts.Count - 1;

                            decimal ovdAtFrom = kistSchedule
                                .Where(k => k.Date.HasValue
                                    && k.Date.Value.Date <= segFrom
                                    && (!firstSession.HasValue || k.Date.Value.Date >= firstSession.Value.Date))
                                .Sum(k => k.PrincipalAmt ?? Math.Max(0m, (k.KistAmount ?? 0m) - (k.InterestAmt ?? 0m)));
                            decimal segBal = Math.Max(0m, principalBal - ovdAtFrom);

                            int segDays = (segTo - segFrom).Days + (isFinalSeg ? 1 : 0);
                            if (segDays > 0 && segBal > 0)
                            {
                                decimal segInt = Math.Round(segBal * (decimal)effectiveStdRate / 100m * segDays / 365m, 2);
                                wInt += segInt;
                                calcSegments.Add(new InterestCalcSegmentDTO
                                {
                                    FromDate = segFrom, ToDate = segTo, Balance = segBal,
                                    Days = segDays, Rate = effectiveStdRate, Interest = segInt,
                                });
                            }
                        }
                        // wInt covers only the current period (calcFromDate → calcToDate).
                        // postedStdInt is the cumulative ALL-TIME Cat 1 total — subtracting it
                        // wrongly makes dynStdInt=0 for old loans with large historical postings.
                        // The current period's interest (wInt) has not been posted yet by definition
                        // (calcFromDate is the last-post date), so use wInt directly.
                        decimal dwiBasedInt = Math.Max(0m, wInt);
                        dynStdInt = Math.Max(schedBasedInt, dwiBasedInt);
                    }

                    // Trigger penal whenever ANY kists are overdue (including all-pre-session accounts
                    // whose full schedule has expired — penal runs on full principal from session start)
                    if (effectiveOvdRate > 0 && overdueKists.Any())
                        ComputePenal(requireOverdueKists: true);
                }
                else if (effectiveStdRate > 0)
                {
                    if (intCalcMethod == "MinBalance")
                    {
                        if (principalBal > 0)
                        {
                            int days = Math.Max(0, (calcToDate - calcFromDate).Days);
                            decimal effPrin = LoanRecoveryVoucherService.CalculateMinimumBalance(openingPrincipal, obDetails, calcFromDate, calcToDate);
                            decimal rawStd = Math.Round(effPrin * (decimal)effectiveStdRate / 100m * days / 365m, 2);
                            dynStdInt = Math.Max(0, rawStd + openStdInt - postedStdInt);
                        }
                    }
                    else
                    {
                        var (wInt, wSegs) = LoanRecoveryVoucherService.ComputeDayWeightedInterest(
                            vcdd, obNetForDWI, calcFromDate, calcToDate, effectiveStdRate);
                        dynStdInt = Math.Max(0, wInt);
                        calcSegments = wSegs;
                    }
                    ComputePenal(requireOverdueKists: false);
                }

                decimal totalPostable = dynStdInt + dynPenalInt;
                string? noReason = null;
                if (totalPostable == 0)
                {
                    if (principalBal == 0)
                        noReason = "No outstanding principal — disbursement voucher may be missing";
                    else if (effectiveStdRate == 0)
                        noReason = "Interest rate not set for this account";
                    else
                        noReason = "No interest accrued yet (loan may be too new)";
                }

                // Round total first, then derive std as (total - penal) so the three values are
                // always consistent: StdInterest + PenalInterest == TotalPostable exactly.
                decimal rndTotal = Math.Round(totalPostable, 0, MidpointRounding.AwayFromZero);
                decimal rndPenal = Math.Round(dynPenalInt,   0, MidpointRounding.AwayFromZero);
                decimal rndStd   = rndTotal - rndPenal;

                result.Add(new LoanInterestBatchItemDTO
                {
                    LoanAccId           = acc.ID,
                    AccountNumber       = acc.AccountNumber,
                    MemberName          = memberName,
                    MemberRelativeName  = memberRel,
                    PrincipalBalance    = principalBal,
                    StdInterest         = rndStd,
                    PenalInterest       = rndPenal,
                    StdRecoverable      = Math.Round(stdRec, 0, MidpointRounding.AwayFromZero),
                    TotalPostable       = rndTotal,
                    CalcFromDate        = calcFromDate == today ? null : (DateTime?)calcFromDate,
                    CalcToDate          = (DateTime?)calcToDate,
                    StdInterestRate     = effectiveStdRate > 0 ? effectiveStdRate : kist?.StandardInterestRate,
                    OverdueInterestRate = effectiveOvdRate > 0 ? effectiveOvdRate : kist?.OverdueInterestRate,
                    IntCalcMethod       = intCalcMethod,
                    ActOnIntPosting     = actOnIntPosting,
                    NoInterestReason    = noReason,
                    CalcBreakdown       = calcSegments,
                    OverdueInstallments = overdueInstallments,
                    OverduePrincipal    = overduePrincipal,
                    PenalBreakdown      = penalBreakdown,
                });
            }
            return result;
        }

        // ── Period-by-Period Interest Detail ─────────────────────────────────────

        public async Task<List<LoanInterestPeriodDetailRowDTO>> GetInterestDetailAsync(
            int loanAccId, int branchId, DateTime? asOfDate = null)
        {
            var result = new List<LoanInterestPeriodDetailRowDTO>();
            DateTime calcToDate = (asOfDate ?? DateTime.Today).Date;

            var acc = await _db.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == loanAccId && x.BranchId == branchId);
            if (acc == null) return result;

            // Loan terms
            var kistInfo = await _db.accountkistdetail.AsNoTracking()
                .Where(x => x.AccountId == loanAccId && x.BrId == branchId)
                .OrderByDescending(x => x.LoanDate)
                .FirstOrDefaultAsync();

            double stdRate   = kistInfo?.StandardInterestRate ?? 0;
            double penalRate = kistInfo?.OverdueInterestRate  ?? 0;
            DateTime? loanDate = kistInfo?.LoanDate;

            // Effective penal rate fallback (identical to GetLoanBalanceAsync)
            if (penalRate == 0 && (kistInfo?.SlabId ?? 0) > 0)
            {
                decimal loanAmt    = (decimal)(kistInfo!.LoanAmountPassed ?? 0);
                int     loanPeriod = kistInfo.LoanPeriod ?? 0;
                var slabDetail = await _db.loanslabdetail.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.SlabId == kistInfo.SlabId!.Value
                        && x.FromAmount <= loanAmt && x.ToAmount >= loanAmt
                        && (x.PeriodFrom == null || x.PeriodFrom <= loanPeriod)
                        && (x.PeriodTo   == null || x.PeriodTo   >= loanPeriod));
                if ((slabDetail?.PenalIntRate ?? 0) > 0)
                    penalRate = slabDetail!.PenalIntRate!.Value;
            }

            bool isAddInBalance = false;
            if (acc.GeneralProductId.HasValue)
            {
                var prodDef = await _db.loanproductdefinition.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ProductId == acc.GeneralProductId.Value && x.BrId == branchId);
                isAddInBalance = prodDef?.ActOnIntPosting == 1;

                // LimitWise (TypeId=4): rates come from accountlimitdetail, not accountkistdetail
                if (prodDef?.TypeId == 4)
                {
                    var limitInfo = await _db.accountlimitdetail.AsNoTracking()
                        .Where(x => x.AccountId == loanAccId && x.BrId == branchId)
                        .OrderByDescending(x => x.LoanDate)
                        .FirstOrDefaultAsync();
                    if (limitInfo != null)
                    {
                        if (stdRate == 0)   stdRate   = limitInfo.StandardInterestRate;
                        if (penalRate == 0) penalRate = limitInfo.OverdueInterestRate;
                        if (loanDate == null) loanDate = limitInfo.LoanDate;
                    }
                }
            }

            // First session start date — penal interest never starts before this date.
            var firstSessionDate = await _db.branchsession.AsNoTracking()
                .Where(s => s.branchid == branchId && s.isfirst)
                .Select(s => (DateTime?)s.fromdate)
                .FirstOrDefaultAsync();

            // Opening balance (migration / historical data)
            var ob = await _db.loanaccopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccId == loanAccId && x.BranchId == branchId);
            var obDetails = await _db.loanaccountbalancedetail.AsNoTracking()
                .Where(x => x.AccountId == loanAccId && x.BrId == branchId)
                .ToListAsync();

            // loanaccountbalancedetail is a bifurcation of TotalBalance — only add it when TotalBalance is absent.
            decimal obDetailAdjDetail = (ob == null || (ob.TotalBalance ?? 0m) == 0m)
                ? (obDetails.Sum(x => x.AmountDr) - obDetails.Sum(x => x.AmountCr))
                : 0m;
            decimal openingBalance = (ob?.TotalBalance ?? 0m) + obDetailAdjDetail;
            if (isAddInBalance)
            {
                decimal obDetailIntAdjDetail = (ob == null || (ob.TotalBalance ?? 0m) == 0m)
                    ? (obDetails.Sum(x => x.IntDr) - obDetails.Sum(x => x.IntCr))
                    : 0m;
                openingBalance += obDetailIntAdjDetail;
            }

            // Opening interest (for IntBal seed)
            decimal openingIntBal = (ob?.OpenInt > 0 && ob?.OpenIntType == "Dr")
                ? (decimal)ob!.OpenInt!.Value : 0m;

            // Voucher events: LA, LR, LInterest (ValueDate is DateTime — not nullable)
            var rawEventsDb = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.AccountId == loanAccId && x.BrId == branchId
                         && (x.EntryStatus == "LA" || x.EntryStatus == "LR" || x.EntryStatus == "LInterest")
                         && (x.VoucherStatus == "V" || x.VoucherStatus == "A"))
                .OrderBy(x => x.ValueDate)
                .ThenBy(x => x.Id)
                .Select(x => new
                {
                    x.Id,
                    x.EntryStatus,
                    x.VoucherAmount,
                    IntCr = x.IntCr ?? 0m,
                    x.ValueDate,
                })
                .ToListAsync();

            // Apply .Date in-memory (avoids EF translation issues)
            var rawEvents = rawEventsDb
                .Select(x => new
                {
                    x.Id,
                    x.EntryStatus,
                    x.VoucherAmount,
                    x.IntCr,
                    EventDate = x.ValueDate.Date,
                })
                .ToList();

            // Stand mode (v1.0.78+): IP entries no longer write VCDD on the loan account.
            // Fetch Cat 3 (StdRecoverable) entries from voucherrecintdetail to show IP events in the ledger.
            var standIpByDate = new Dictionary<DateTime, decimal>();
            if (!isAddInBalance)
            {
                var cat3Rows = await _db.voucherrecintdetail.AsNoTracking()
                    .Where(x => x.AccId == loanAccId && x.BrId == branchId
                             && x.IntCatId == CAT_STDREC && x.IntDr > 0)
                    .Select(x => new { x.EntryDate, x.IntDr })
                    .ToListAsync();
                standIpByDate = cat3Rows
                    .GroupBy(x => x.EntryDate.Date)
                    .ToDictionary(g => g.Key, g => (decimal)g.Sum(x => x.IntDr));
            }

            // Kist schedule (for checkpoint dates and overdue tracking)
            var kistSchedule = await _db.accountkistschedule.AsNoTracking()
                .Where(x => x.LoanAccId == loanAccId)
                .OrderBy(x => x.KistNumber)
                .ToListAsync();

            // Build sorted unique checkpoint set.
            // Floor: never add a date earlier than the loan date — guards against corrupted
            // kist schedule rows where k.Date was stored with an incorrect year.
            DateTime checkpointFloor = loanDate?.Date ?? DateTime.MinValue;
            var checkpoints = new SortedSet<DateTime>();
            if (loanDate.HasValue && loanDate.Value.Date <= calcToDate)
                checkpoints.Add(loanDate.Value.Date);
            foreach (var k in kistSchedule)
                if (k.Date.HasValue && k.Date.Value.Date >= checkpointFloor && k.Date.Value.Date <= calcToDate)
                    checkpoints.Add(k.Date.Value.Date);
            foreach (var e in rawEvents)
                if (e.EventDate >= checkpointFloor && e.EventDate <= calcToDate)
                    checkpoints.Add(e.EventDate);
            foreach (var d in standIpByDate.Keys)
                if (d >= checkpointFloor && d <= calcToDate)
                    checkpoints.Add(d);
            checkpoints.Add(calcToDate);

            // Clamp to first session — pre-session periods are covered by the opening balance entry.
            // Remove all checkpoints that fall before the first session start and seed from there instead.
            if (firstSessionDate.HasValue)
            {
                var toRemove = checkpoints.Where(d => d < firstSessionDate.Value.Date).ToList();
                foreach (var d in toRemove) checkpoints.Remove(d);
                checkpoints.Add(firstSessionDate.Value.Date);
            }

            if (!checkpoints.Any()) return result;

            // Group events by date
            var eventsByDate = rawEvents
                .Where(e => e.EventDate <= calcToDate)
                .GroupBy(e => e.EventDate)
                .ToDictionary(g => g.Key, g => g.ToList());

            // If ALL kist due dates fall before the first session start, the loan's full schedule has
            // expired before this session began — the entire principal is in overdue status.
            bool scheduleExpiredBeforeSession = firstSessionDate.HasValue
                && kistSchedule.Any()
                && kistSchedule.All(k => !k.Date.HasValue || k.Date.Value.Date < firstSessionDate.Value.Date);

            decimal runningBalance = openingBalance;
            decimal runningIntBal  = openingIntBal;
            DateTime? prevDate = null;

            foreach (var date in checkpoints)
            {
                // Include the end date itself in the day count (banking inclusive-end convention).
                // Add +1 only on the final "As on Date" period to avoid double-counting across periods.
                bool isFinalPeriod = date == calcToDate;
                int     days   = prevDate.HasValue ? (date - prevDate.Value).Days + (isFinalPeriod ? 1 : 0) : 0;
                decimal stdInt = 0m;
                decimal ovrInt = 0m;

                // Overdue kist principal at the START of this period (due on or before prevDate).
                // Using <= so a kist that fell due exactly on prevDate is already in overdue status
                // for the current period — its principal no longer earns standard interest.
                // Only count post-session kists; pre-session principal is baked into the opening balance.
                decimal ovdPrinAtPrev = prevDate.HasValue
                    ? kistSchedule
                        .Where(k => k.Date.HasValue
                            && k.Date.Value.Date <= prevDate!.Value
                            && (!firstSessionDate.HasValue || k.Date.Value.Date >= firstSessionDate.Value.Date))
                        .Sum(k => k.PrincipalAmt ?? Math.Max(0m, (k.KistAmount ?? 0m) - (k.InterestAmt ?? 0m)))
                    : 0m;
                decimal performingBal = scheduleExpiredBeforeSession ? 0m : Math.Max(0m, runningBalance - ovdPrinAtPrev);

                // Display balance: kists due ON OR BEFORE this date are already overdue.
                // This shows the reduction immediately on the kist's own row (not the next row).
                // When the full schedule expired before the session, entire balance is overdue (STD BAL = 0).
                decimal ovdPrinAtDate = kistSchedule
                    .Where(k => k.Date.HasValue
                        && k.Date.Value.Date <= date
                        && (!firstSessionDate.HasValue || k.Date.Value.Date >= firstSessionDate.Value.Date))
                    .Sum(k => k.PrincipalAmt ?? Math.Max(0m, (k.KistAmount ?? 0m) - (k.InterestAmt ?? 0m)));
                decimal displayStdBal = scheduleExpiredBeforeSession ? 0m : Math.Max(0m, runningBalance - ovdPrinAtDate);

                // Kist principals newly entering overdue status on this exact date — shown in Cr column
                // as the amount being transferred from standard balance to overdue balance.
                decimal kistsNewlyOverdue = kistSchedule
                    .Where(k => k.Date.HasValue
                        && k.Date.Value.Date == date
                        && (!firstSessionDate.HasValue || k.Date.Value.Date >= firstSessionDate.Value.Date))
                    .Sum(k => k.PrincipalAmt ?? Math.Max(0m, (k.KistAmount ?? 0m) - (k.InterestAmt ?? 0m)));

                if (days > 0 && performingBal > 0 && stdRate > 0)
                    stdInt = Math.Round(performingBal * (decimal)stdRate / 100m * days / 365m, 2);

                if (days > 0 && prevDate.HasValue && penalRate > 0 && !isAddInBalance)
                {
                    // Kists past-due at the START of this period (due on or before prevDate).
                    // AddInBalance loans: interest (incl. overdue component) is baked into principal — skip.
                    // Only charge penal for periods starting on or after the first session date.
                    // Opening interest already covers everything before that date.
                    bool periodAfterSession = !firstSessionDate.HasValue || prevDate!.Value >= firstSessionDate.Value.Date;
                    var ovdAtPrev = periodAfterSession
                        ? kistSchedule.Where(k => k.Date.HasValue && k.Date.Value.Date <= prevDate!.Value).ToList()
                        : new List<BankingPlatform.Infrastructure.Models.AccMasters.Loan.AccountKistSchedule>();
                    if (ovdAtPrev.Any())
                    {
                        foreach (var ok in ovdAtPrev)
                        {
                            decimal kistPrin = ok.PrincipalAmt
                                ?? Math.Max(0m, (ok.KistAmount ?? 0m) - (ok.InterestAmt ?? 0m));
                            // WO/interest-only schedule: KistAmount == InterestAmt, so kistPrin = 0.
                            // Fall back to distributing the running principal balance across overdue kists,
                            // matching the same fallback used in GetLoanBalanceAsync / BatchCalculate.
                            if (kistPrin <= 0 && runningBalance > 0)
                                kistPrin = runningBalance / ovdAtPrev.Count;
                            if (kistPrin > 0)
                                ovrInt += Math.Round(kistPrin * (decimal)penalRate / 100m * days / 365m, 2);
                        }
                    }
                    else if (periodAfterSession && kistInfo != null && kistInfo.KistFirstDate.Date <= prevDate!.Value && runningBalance > 0)
                    {
                        // No schedule rows at all (or none due yet) but the first kist was due by prevDate.
                        // Fall back to the same logic as GetLoanBalanceAsync: charge penal on the full
                        // outstanding balance, matching the no-schedule path in the single-account service.
                        ovrInt = Math.Round(runningBalance * (decimal)penalRate / 100m * days / 365m, 2);
                    }
                }

                // Events on this date
                decimal drOnDate          = 0m;
                decimal crOnDate          = 0m;
                decimal ipOnDate          = 0m;
                decimal intRecoveredOnDate = 0m;
                string  particulars       = "";
                bool    hasLa = false, hasLr = false, hasIp = false;

                if (eventsByDate.TryGetValue(date, out var dateEvents))
                {
                    foreach (var ev in dateEvents)
                    {
                        switch (ev.EntryStatus)
                        {
                            case "LA":
                                drOnDate       += ev.VoucherAmount;
                                runningBalance += ev.VoucherAmount;
                                hasLa = true;
                                break;
                            case "LR":
                                crOnDate       += ev.VoucherAmount;
                                runningBalance -= ev.VoucherAmount;
                                intRecoveredOnDate += ev.IntCr;
                                hasLr = true;
                                break;
                            case "LInterest":
                                ipOnDate += ev.VoucherAmount;
                                if (isAddInBalance)
                                {
                                    drOnDate       += ev.VoucherAmount;
                                    runningBalance += ev.VoucherAmount;
                                }
                                hasIp = true;
                                break;
                        }
                    }
                    runningBalance = Math.Max(0m, runningBalance);

                    if (hasLa)       particulars = "Loan Advancement";
                    else if (hasLr && hasIp) particulars = "Recovery & Int. Posting";
                    else if (hasLr)  particulars = "Loan Recovery";
                    else if (hasIp)  particulars = "Interest Posting";
                }

                // Stand mode (v1.0.78+): surface new-style IP events from Cat3 voucherrecintdetail
                if (!isAddInBalance && standIpByDate.TryGetValue(date, out var standIpAmt) && !hasIp)
                {
                    ipOnDate += standIpAmt;
                    hasIp = true;
                    if (hasLr) particulars = "Recovery & Int. Posting";
                    else if (string.IsNullOrEmpty(particulars)) particulars = "Interest Posting";
                }

                // Add kist label if a kist is due on this date
                var kistsOnDate = kistSchedule
                    .Where(k => k.Date.HasValue && k.Date.Value.Date == date)
                    .ToList();
                if (kistsOnDate.Any())
                {
                    string kistLabel = kistsOnDate.Count == 1
                        ? $"Kist #{kistsOnDate[0].KistNumber ?? 0} Due"
                        : $"Kists #{string.Join(", #", kistsOnDate.Select(k => k.KistNumber ?? 0))} Due";
                    particulars = string.IsNullOrEmpty(particulars)
                        ? kistLabel
                        : $"{kistLabel} / {particulars}";
                }

                if (string.IsNullOrEmpty(particulars))
                    particulars = date == calcToDate ? "As on Date" : "Balance";

                // Show the overdue transfer in the Cr column (principal moving from Std to Ovd)
                if (kistsNewlyOverdue > 0)
                    crOnDate += kistsNewlyOverdue;

                // Overdue snapshot AT this date (kists strictly past-due)
                var ovdAtDate = kistSchedule
                    .Where(k => k.Date.HasValue && k.Date.Value.Date < date)
                    .ToList();
                int     odc = ovdAtDate.Count;
                decimal odb = scheduleExpiredBeforeSession
                    ? runningBalance  // full balance is overdue when schedule has expired
                    : ovdAtDate.Sum(k => k.PrincipalAmt ?? Math.Max(0m, (k.KistAmount ?? 0m) - (k.InterestAmt ?? 0m)));
                int odd = odc > 0
                    ? (int)(date - ovdAtDate.Min(k => k.Date!.Value.Date)).TotalDays + (isFinalPeriod ? 1 : 0)
                    : (scheduleExpiredBeforeSession && firstSessionDate.HasValue
                        ? (int)(date - firstSessionDate.Value.Date).TotalDays + (isFinalPeriod ? 1 : 0)
                        : 0);

                // Update running interest balance
                runningIntBal += stdInt + ovrInt
                    - ipOnDate          // formal posting reduces outstanding
                    - intRecoveredOnDate; // interest recovery reduces outstanding
                runningIntBal = Math.Max(0m, runningIntBal);

                result.Add(new LoanInterestPeriodDetailRowDTO
                {
                    Date        = date,
                    Particulars = particulars,
                    Days        = days,
                    Dr          = drOnDate,
                    Cr          = crOnDate,
                    StdBal      = displayStdBal,  // performing balance after kists due on this date go overdue
                    Roi         = stdRate,
                    StdInt      = stdInt,
                    Odd         = odd,
                    Odc         = odc,
                    Odb         = odb,
                    Balance     = runningBalance,  // total outstanding principal
                    Oroi        = penalRate,
                    OvrInt      = ovrInt,
                    TInt        = stdInt + ovrInt,
                    IntBal      = runningIntBal,
                });

                prevDate = date;
            }

            return result;
        }

        // ── Batch Post — one voucher for all accounts ─────────────────────────────

        public async Task<LoanInterestBatchPostResultDTO> BatchPostInterestAsync(LoanInterestBatchPostRequestDTO dto)
        {
            int fail = 0;
            var errors   = new List<string>();
            var valid    = new List<(LoanInterestBatchPostItemDTO item, LoanInterestPostingInfoDTO info,
                                     decimal stdAmt, decimal penalAmt, decimal total,
                                     long loanHead, int crAccId, long crHead, bool isAib, int drAccId, long drHead)>();

            // ── Pass 1: validate every item before touching the DB ────────────────
            foreach (var item in dto.Items)
            {
                decimal stdAmt   = Math.Round(item.StdInterestAmount,   0, MidpointRounding.AwayFromZero);
                decimal penalAmt = Math.Round(item.PenalInterestAmount, 0, MidpointRounding.AwayFromZero);
                decimal total    = stdAmt + penalAmt;

                if (total <= 0)
                {
                    errors.Add($"Account {item.LoanAccountId}: No interest amount to post.");
                    fail++;
                    continue;
                }

                var info = await GetPostableInterestAsync(item.LoanAccountId, dto.BrId, dto.VoucherDate);
                if (info == null)
                {
                    errors.Add($"Account {item.LoanAccountId}: Account not found.");
                    fail++;
                    continue;
                }

                bool isAib = info.ActOnIntPosting == 1;
                if (!isAib)
                {
                    if (stdAmt > info.UnpostedStdInterest + 0.01m)
                    {
                        errors.Add($"Account {item.LoanAccountId}: Standard interest ({stdAmt:N2}) exceeds unposted amount ({info.UnpostedStdInterest:N2}).");
                        fail++;
                        continue;
                    }
                    if (penalAmt > info.UnpostedPenalInterest + 0.01m)
                    {
                        errors.Add($"Account {item.LoanAccountId}: Penal interest ({penalAmt:N2}) exceeds unposted amount ({info.UnpostedPenalInterest:N2}).");
                        fail++;
                        continue;
                    }
                }

                long loanHead = await _cf.GetAccountHeadCodeFromAccId(item.LoanAccountId, dto.BrId);

                int  crAccId = item.LoanAccountId;
                long crHead  = loanHead;
                int  drAccId = item.LoanAccountId;
                long drHead  = loanHead;
                var acc = await _db.accountmaster.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ID == item.LoanAccountId && x.BranchId == dto.BrId);
                if (acc?.GeneralProductId.HasValue == true)
                {
                    var rule = await _cf.GetLoanProductBranchWiseRuleInfo(dto.BrId, acc.GeneralProductId.Value);
                    if (rule.IntIncomeAcc.HasValue && rule.IntIncomeAcc.Value > 0)
                    {
                        crAccId = rule.IntIncomeAcc.Value;
                        crHead  = await _cf.GetAccountHeadCodeFromAccId(crAccId, dto.BrId);
                    }
                    if (!isAib && rule.CurrentRecoverableIntAcc.HasValue && rule.CurrentRecoverableIntAcc.Value > 0)
                    {
                        drAccId = rule.CurrentRecoverableIntAcc.Value;
                        drHead  = await _cf.GetAccountHeadCodeFromAccId(drAccId, dto.BrId);
                    }
                }

                valid.Add((item, info, stdAmt, penalAmt, total, loanHead, crAccId, crHead, isAib, drAccId, drHead));
            }

            if (valid.Count == 0)
                return new LoanInterestBatchPostResultDTO { SuccessCount = 0, FailCount = fail, Errors = errors };

            // ── Pass 2: one transaction, one voucher ──────────────────────────────
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                bool   autoVerify = await _cf.IsAutoVerification(dto.BrId);
                string vrStatus   = autoVerify ? "V" : "A";
                int    userId     = int.Parse(_cf.GetCurrentUserId()!);
                int    nextVrNo   = await _cf.GetLatestVoucherNo(dto.BrId, dto.VoucherDate);
                DateTime vrDate   = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valDate  = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narr       = string.IsNullOrWhiteSpace(dto.Narration)
                    ? $"Loan Interest Posting - {dto.VoucherDate:dd-MMM-yyyy}"
                    : dto.Narration;

                var voucher = new Voucher
                {
                    BrID             = dto.BrId,
                    VoucherNo        = nextVrNo,
                    VoucherType      = (int)Enums.VoucherType.Loan,
                    VoucherSubType   = (int)Enums.VoucherSubType.InterestPosting,
                    VoucherDate      = vrDate,
                    ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherNarration = narr,
                    VoucherStatus    = vrStatus,
                    AddedBy          = userId,
                    ModifiedBy       = 0,
                    VerifiedBy       = autoVerify ? userId : 0,
                    OtherBrID        = 0,
                };
                await _db.voucher.AddAsync(voucher);
                await _db.SaveChangesAsync();
                int voucherId = voucher.Id;

                int row = 1;

                // ── Stand accounts: ONE combined Dr + ONE combined Cr ─────────────
                var validStand = valid.Where(v => !v.isAib).ToList();
                var validAib   = valid.Where(v => v.isAib).ToList();
                int standIpEntryId = 0;

                if (validStand.Any())
                {
                    decimal standSum = validStand.Sum(v => v.total);
                    var fs = validStand[0];  // all same product → same drAccId / crAccId

                    var standDrEntry = new VoucherCreditDebitDetails
                    {
                        BrId = dto.BrId, VoucherID = voucherId,
                        AccountId = fs.drAccId, AccHeadCode = fs.drHead,
                        VoucherAmount = standSum, VoucherEntryType = "Dr", EntryStatus = "Dr",
                        Narration = narr, VoucherStatus = vrStatus, ValueDate = valDate, VoucherSeqNo = row++,
                        IntDr = null, IntCr = null, ExpenseAmt = 0, HCL1 = 0, HCL2 = 0, HCL3 = 0,
                    };
                    await _db.vouchercreditdebitdetails.AddAsync(standDrEntry);
                    await _db.SaveChangesAsync();
                    standIpEntryId = standDrEntry.Id;

                    await _db.vouchercreditdebitdetails.AddAsync(new VoucherCreditDebitDetails
                    {
                        BrId = dto.BrId, VoucherID = voucherId,
                        AccountId = fs.crAccId, AccHeadCode = fs.crHead,
                        VoucherAmount = standSum, VoucherEntryType = "Cr", EntryStatus = Enums.VoucherStatus.Cr.ToString(),
                        Narration = narr, VoucherStatus = vrStatus, ValueDate = valDate, VoucherSeqNo = row++,
                        IntDr = null, IntCr = null, ExpenseAmt = 0, HCL1 = 0, HCL2 = 0, HCL3 = 0,
                    });

                    // Per-account voucherrecintdetail for Stand
                    foreach (var (item, info, stdAmt, penalAmt, total, loanHead, crAccId, crHead, isAib, drAccId, drHead) in validStand)
                    {
                        if (stdAmt > 0)
                            await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                            {
                                BrId = dto.BrId, VAccCrDrId = standIpEntryId,
                                VoucherId = voucherId, VoucherNo = nextVrNo,
                                EntryDate = vrDate, ValueDate = valDate,
                                IntCatId = CAT_STD, Pamt = (double)info.PrincipalBalance,
                                AccId = item.LoanAccountId,
                                IntDr = (double)stdAmt, IntCr = (double)stdAmt,
                                VoucherMainStatus = vrStatus,
                            });
                        if (penalAmt > 0)
                            await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                            {
                                BrId = dto.BrId, VAccCrDrId = standIpEntryId,
                                VoucherId = voucherId, VoucherNo = nextVrNo,
                                EntryDate = vrDate, ValueDate = valDate,
                                IntCatId = CAT_PENAL, Pamt = (double)info.PrincipalBalance,
                                AccId = item.LoanAccountId,
                                IntDr = (double)penalAmt, IntCr = (double)penalAmt,
                                VoucherMainStatus = vrStatus,
                            });
                        // Cat 3 — outstanding recoverable (IntCr filled on recovery)
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId = dto.BrId, VAccCrDrId = standIpEntryId,
                            VoucherId = voucherId, VoucherNo = nextVrNo,
                            EntryDate = vrDate, ValueDate = valDate,
                            IntCatId = CAT_STDREC, Pamt = (double)info.PrincipalBalance,
                            AccId = item.LoanAccountId,
                            IntDr = (double)total, IntCr = 0,
                            VoucherMainStatus = vrStatus,
                        });
                    }
                    await _db.SaveChangesAsync();
                }

                // ── AddInBalance accounts: per-account Dr + Cr (unchanged) ────────
                foreach (var (item, info, stdAmt, penalAmt, total, loanHead, crAccId, crHead, isAib, drAccId, drHead) in validAib)
                {
                    var drEntry = new VoucherCreditDebitDetails
                    {
                        BrId = dto.BrId, VoucherID = voucherId,
                        AccountId = item.LoanAccountId, AccHeadCode = loanHead,
                        VoucherAmount = total, VoucherEntryType = "Dr", EntryStatus = "LInterest",
                        Narration = narr, VoucherStatus = vrStatus, ValueDate = valDate, VoucherSeqNo = row++,
                        IntDr = total, IntCr = null, ExpenseAmt = 0, HCL1 = 0, HCL2 = 0, HCL3 = 0,
                    };
                    await _db.vouchercreditdebitdetails.AddAsync(drEntry);
                    await _db.SaveChangesAsync();
                    int ipEntryId = drEntry.Id;

                    await _db.vouchercreditdebitdetails.AddAsync(new VoucherCreditDebitDetails
                    {
                        BrId = dto.BrId, VoucherID = voucherId,
                        AccountId = crAccId, AccHeadCode = crHead,
                        VoucherAmount = total, VoucherEntryType = "Cr", EntryStatus = Enums.VoucherStatus.Cr.ToString(),
                        Narration = narr, VoucherStatus = vrStatus, ValueDate = valDate, VoucherSeqNo = row++,
                        IntDr = null, IntCr = null, ExpenseAmt = 0, HCL1 = 0, HCL2 = 0, HCL3 = 0,
                    });

                    if (stdAmt > 0)
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId = dto.BrId, VAccCrDrId = ipEntryId,
                            VoucherId = voucherId, VoucherNo = nextVrNo,
                            EntryDate = vrDate, ValueDate = valDate,
                            IntCatId = CAT_STD, Pamt = (double)info.PrincipalBalance,
                            AccId = item.LoanAccountId,
                            IntDr = (double)stdAmt, IntCr = (double)stdAmt,
                            VoucherMainStatus = vrStatus,
                        });
                    if (penalAmt > 0)
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId = dto.BrId, VAccCrDrId = ipEntryId,
                            VoucherId = voucherId, VoucherNo = nextVrNo,
                            EntryDate = vrDate, ValueDate = valDate,
                            IntCatId = CAT_PENAL, Pamt = (double)info.PrincipalBalance,
                            AccId = item.LoanAccountId,
                            IntDr = (double)penalAmt, IntCr = (double)penalAmt,
                            VoucherMainStatus = vrStatus,
                        });

                    await _db.SaveChangesAsync();
                }

                await tx.CommitAsync();
                return new LoanInterestBatchPostResultDTO
                {
                    SuccessCount = valid.Count,
                    FailCount    = fail,
                    Errors       = errors,
                };
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                errors.Add(ex.Message);
                return new LoanInterestBatchPostResultDTO { SuccessCount = 0, FailCount = dto.Items.Count, Errors = errors };
            }
        }
    }
}
