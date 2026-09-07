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

        private const int CAT_STD   = (int)Enums.IntCategory.StdInterest;
        private const int CAT_PENAL = (int)Enums.IntCategory.PenalInterest;

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
                         && !x.IsAccClosed
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

                // Validate against actual unposted interest (skipped for AddInBalance — no separate interest ledger)
                var info = await GetPostableInterestAsync(dto.LoanAccountId, dto.BrId, dto.VoucherDate);
                if (info == null)
                    return ("Loan account not found.", 0);
                bool isAddInBalance = info.ActOnIntPosting == 1;
                if (!isAddInBalance)
                {
                    if (stdAmt > info.UnpostedStdInterest + 0.01m)
                        return ($"Standard interest ({stdAmt:N2}) exceeds unposted amount ({info.UnpostedStdInterest:N2}).", 0);
                    if (penalAmt > info.UnpostedPenalInterest + 0.01m)
                        return ($"Penal interest ({penalAmt:N2}) exceeds unposted amount ({info.UnpostedPenalInterest:N2}).", 0);
                }

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

                int  intIncomeAccId = 0;
                long intIncomeHead  = 0;
                if (acc?.GeneralProductId.HasValue == true)
                {
                    var rule = await _cf.GetLoanProductBranchWiseRuleInfo(dto.BrId, acc.GeneralProductId.Value);
                    if (rule.IntIncomeAcc.HasValue && rule.IntIncomeAcc.Value > 0)
                    {
                        intIncomeAccId = rule.IntIncomeAcc.Value;
                        intIncomeHead  = await _cf.GetAccountHeadCodeFromAccId(intIncomeAccId, dto.BrId);
                    }
                }

                // ── VoucherCreditDebitDetails ─────────────────────────────────────
                int row = 1;

                // Dr: Loan account (interest charged — EntryStatus="LInterest", VoucherAmount=total)
                var drEntry = new VoucherCreditDebitDetails
                {
                    BrId             = dto.BrId,
                    VoucherID        = voucherId,
                    AccountId        = dto.LoanAccountId,
                    AccHeadCode      = loanHead,
                    VoucherAmount    = total,
                    VoucherEntryType = "Dr",
                    EntryStatus      = "LInterest",
                    Narration        = narr,
                    VoucherStatus    = vrStatus,
                    ValueDate        = valDate,
                    VoucherSeqNo     = row,
                    IntDr            = total,
                    IntCr            = null,
                    ExpenseAmt       = 0,
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await _db.vouchercreditdebitdetails.AddAsync(drEntry);
                await _db.SaveChangesAsync();
                int ipEntryId = drEntry.Id;
                row++;

                // Cr: Interest Income account (income recognized — receipt side in Day Book)
                //     Falls back to loan account if no income account configured
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

                // ── VoucherRecIntDetail — interest ledger entries for ALL loan types ────────
                // AddInBalance: IntDr = IntCr = amount (interest embedded in principal, fully posted)
                // Stand:        IntDr = amount, IntCr = 0 (interest outstanding until recovered)
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
                        IntCr             = isAddInBalance ? (double)stdAmt : 0,
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
                        IntCr             = isAddInBalance ? (double)penalAmt : 0,
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

        public async Task<List<LoanInterestBatchItemDTO>> BatchCalculateInterestAsync(int brId, int productId, int? accountId, DateTime? asOfDate = null)
        {
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == brId
                         && x.GeneralProductId == productId
                         && x.AccTypeId == (int)Enums.AccountTypes.Loan
                         && !x.IsAccClosed
                         && (!accountId.HasValue || x.ID == accountId.Value))
                .OrderBy(x => x.AccountNumber)
                .Select(x => new { x.ID, x.AccountNumber })
                .ToListAsync();

            var result = new List<LoanInterestBatchItemDTO>();
            foreach (var acc in accounts)
            {
                var bal = await _recoveryService.GetLoanBalanceAsync(acc.ID, brId, asOfDate);
                if (bal == null) continue;

                decimal totalPostable = bal.StdInterestOutstanding + bal.PenalInterestOutstanding;
                string? noReason = null;

                decimal aibStdInt   = 0m;
                DateTime? aibFrom   = null;
                DateTime  aibTo     = asOfDate ?? DateTime.Today;

                if (bal.ActOnIntPosting == 1)
                {
                    // AddInBalance: GetLoanBalanceAsync returns 0 for StdInterestOutstanding because
                    // interest is embedded in principal. Compute the new accrued interest here using
                    // the same method (Schedule/Balance/MinBalance) as configured on the product.
                    DateTime? lastIpDate = await _db.voucherrecintdetail.AsNoTracking()
                        .Where(x => x.AccId == acc.ID && x.BrId == brId)
                        .OrderByDescending(x => x.EntryDate)
                        .Select(x => (DateTime?)x.EntryDate)
                        .FirstOrDefaultAsync();

                    aibFrom = (lastIpDate?.Date ?? bal.LoanDate) ?? aibTo;
                    int days = Math.Max(0, (aibTo - aibFrom.Value.Date).Days);

                    if (days > 0 && bal.PrincipalBalance > 0 && (bal.StandardInterestRate ?? 0) > 0)
                    {
                        decimal rate = (decimal)bal.StandardInterestRate!.Value;

                        if (bal.IntCalcMethod == "Schedule")
                        {
                            // Sum interest amounts from kist schedule entries due after the last IP date
                            var schedKists = await _db.accountkistschedule.AsNoTracking()
                                .Where(x => x.LoanAccId == acc.ID
                                         && x.Date.HasValue
                                         && x.Date.Value.Date > aibFrom.Value.Date
                                         && x.Date.Value.Date <= aibTo)
                                .ToListAsync();
                            aibStdInt = schedKists.Sum(x => x.InterestAmt ?? 0m);
                            // Fall back to Balance method when schedule has no interest entries
                            if (aibStdInt == 0)
                                aibStdInt = Math.Round(bal.PrincipalBalance * rate / 100m * days / 365m, 0, MidpointRounding.AwayFromZero);
                        }
                        else
                        {
                            // Balance or MinBalance: use current outstanding principal
                            aibStdInt = Math.Round(bal.PrincipalBalance * rate / 100m * days / 365m, 0, MidpointRounding.AwayFromZero);
                        }
                    }

                    totalPostable = aibStdInt;
                    if (aibStdInt == 0)
                        noReason = "No interest accrued yet";
                }
                else if (totalPostable == 0)
                {
                    if (bal.PrincipalBalance == 0)
                        noReason = "No outstanding principal — disbursement voucher may be missing";
                    else if (bal.StandardInterestRate == null || bal.StandardInterestRate == 0)
                        noReason = "Interest rate not set for this account";
                    else
                        noReason = "No interest accrued yet (loan may be too new)";
                }

                result.Add(new LoanInterestBatchItemDTO
                {
                    LoanAccId           = acc.ID,
                    AccountNumber       = acc.AccountNumber,
                    MemberName          = bal.MemberName,
                    MemberRelativeName  = bal.MemberRelativeName,
                    PrincipalBalance    = bal.PrincipalBalance,
                    StdInterest         = Math.Round(bal.ActOnIntPosting == 1 ? aibStdInt         : bal.StdInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                    PenalInterest       = Math.Round(bal.ActOnIntPosting == 1 ? 0m                : bal.PenalInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                    StdRecoverable      = Math.Round(bal.ActOnIntPosting == 1 ? 0m                : bal.StdRecoverableOutstanding, 0, MidpointRounding.AwayFromZero),
                    TotalPostable       = Math.Round(totalPostable, 0, MidpointRounding.AwayFromZero),
                    CalcFromDate        = bal.ActOnIntPosting == 1 ? aibFrom           : bal.InterestCalcFromDate,
                    CalcToDate          = bal.ActOnIntPosting == 1 ? (DateTime?)aibTo  : bal.InterestCalcToDate,
                    StdInterestRate     = bal.StandardInterestRate,
                    OverdueInterestRate = bal.OverdueInterestRate,
                    IntCalcMethod       = bal.IntCalcMethod,
                    ActOnIntPosting     = bal.ActOnIntPosting,
                    NoInterestReason    = noReason,
                    CalcBreakdown       = bal.CalcBreakdown,
                    OverdueInstallments = bal.OverdueInstallments,
                    OverduePrincipal    = bal.OverduePrincipal,
                    PenalBreakdown      = bal.PenalBreakdown,
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
            }

            // Opening balance (migration / historical data)
            var ob = await _db.loanaccopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccId == loanAccId && x.BranchId == branchId);
            var obDetails = await _db.loanaccountbalancedetail.AsNoTracking()
                .Where(x => x.AccountId == loanAccId && x.BrId == branchId)
                .ToListAsync();

            decimal openingBalance = (ob?.TotalBalance ?? 0m)
                                   + obDetails.Sum(x => x.AmountDr)
                                   - obDetails.Sum(x => x.AmountCr);
            if (isAddInBalance)
                openingBalance += obDetails.Sum(x => x.IntDr) - obDetails.Sum(x => x.IntCr);

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

            // Kist schedule (for checkpoint dates and overdue tracking)
            var kistSchedule = await _db.accountkistschedule.AsNoTracking()
                .Where(x => x.LoanAccId == loanAccId)
                .OrderBy(x => x.KistNumber)
                .ToListAsync();

            // Build sorted unique checkpoint set
            var checkpoints = new SortedSet<DateTime>();
            if (loanDate.HasValue && loanDate.Value.Date <= calcToDate)
                checkpoints.Add(loanDate.Value.Date);
            foreach (var k in kistSchedule)
                if (k.Date.HasValue && k.Date.Value.Date <= calcToDate)
                    checkpoints.Add(k.Date.Value.Date);
            foreach (var e in rawEvents)
                if (e.EventDate <= calcToDate)
                    checkpoints.Add(e.EventDate);
            checkpoints.Add(calcToDate);

            if (!checkpoints.Any()) return result;

            // Group events by date
            var eventsByDate = rawEvents
                .Where(e => e.EventDate <= calcToDate)
                .GroupBy(e => e.EventDate)
                .ToDictionary(g => g.Key, g => g.ToList());

            decimal runningBalance = openingBalance;
            decimal runningIntBal  = openingIntBal;
            DateTime? prevDate = null;

            foreach (var date in checkpoints)
            {
                // Interest accrued in [prevDate, date) using balance at prevDate
                int     days   = prevDate.HasValue ? (date - prevDate.Value).Days : 0;
                decimal stdInt = 0m;
                decimal ovrInt = 0m;

                if (days > 0 && runningBalance > 0 && stdRate > 0)
                    stdInt = Math.Round(runningBalance * (decimal)stdRate / 100m * days / 365m, 2);

                if (days > 0 && prevDate.HasValue && penalRate > 0)
                {
                    // Kists past-due at the START of this period (due on or before prevDate)
                    var ovdAtPrev = kistSchedule
                        .Where(k => k.Date.HasValue && k.Date.Value.Date <= prevDate!.Value)
                        .ToList();
                    foreach (var ok in ovdAtPrev)
                    {
                        decimal kistPrin = ok.PrincipalAmt
                            ?? Math.Max(0m, (ok.KistAmount ?? 0m) - (ok.InterestAmt ?? 0m));
                        if (kistPrin > 0)
                            ovrInt += Math.Round(kistPrin * (decimal)penalRate / 100m * days / 365m, 2);
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

                // Overdue snapshot AT this date (kists strictly past-due)
                var ovdAtDate = kistSchedule
                    .Where(k => k.Date.HasValue && k.Date.Value.Date < date)
                    .ToList();
                int     odc = ovdAtDate.Count;
                decimal odb = ovdAtDate.Sum(k =>
                    k.PrincipalAmt ?? Math.Max(0m, (k.KistAmount ?? 0m) - (k.InterestAmt ?? 0m)));
                int odd = odc > 0
                    ? (int)(date - ovdAtDate.Min(k => k.Date!.Value.Date)).TotalDays
                    : 0;

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
                    StdBal      = runningBalance,
                    Roi         = stdRate,
                    StdInt      = stdInt,
                    Odd         = odd,
                    Odc         = odc,
                    Odb         = odb,
                    Balance     = runningBalance,
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
                                     long loanHead, int crAccId, long crHead)>();

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

                int  crAccId  = item.LoanAccountId;
                long crHead   = loanHead;
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
                }

                valid.Add((item, info, stdAmt, penalAmt, total, loanHead, crAccId, crHead));
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
                foreach (var (item, info, stdAmt, penalAmt, total, loanHead, crAccId, crHead) in valid)
                {
                    // Dr: loan account (interest charged — EntryStatus="LInterest")
                    var drEntry = new VoucherCreditDebitDetails
                    {
                        BrId             = dto.BrId,
                        VoucherID        = voucherId,
                        AccountId        = item.LoanAccountId,
                        AccHeadCode      = loanHead,
                        VoucherAmount    = total,
                        VoucherEntryType = "Dr",
                        EntryStatus      = "LInterest",
                        Narration        = narr,
                        VoucherStatus    = vrStatus,
                        ValueDate        = valDate,
                        VoucherSeqNo     = row++,
                        IntDr            = total,
                        IntCr            = null,
                        ExpenseAmt       = 0,
                        HCL1 = 0, HCL2 = 0, HCL3 = 0,
                    };
                    await _db.vouchercreditdebitdetails.AddAsync(drEntry);
                    await _db.SaveChangesAsync();
                    int ipEntryId = drEntry.Id;

                    // Cr: interest income GL
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
                        VoucherSeqNo     = row++,
                        IntDr = null, IntCr = null, ExpenseAmt = 0,
                        HCL1 = 0, HCL2 = 0, HCL3 = 0,
                    });

                    // VoucherRecIntDetail — ALL loan types
                    // AddInBalance: IntDr = IntCr = amount; Stand: IntDr = amount, IntCr = 0
                    bool isAib = info.ActOnIntPosting == 1;
                    if (stdAmt > 0)
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId = dto.BrId, VAccCrDrId = ipEntryId,
                            VoucherId = voucherId, VoucherNo = nextVrNo,
                            EntryDate = vrDate, ValueDate = valDate,
                            IntCatId = CAT_STD, Pamt = (double)info.PrincipalBalance,
                            AccId = item.LoanAccountId,
                            IntDr = (double)stdAmt, IntCr = isAib ? (double)stdAmt : 0,
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
                            IntDr = (double)penalAmt, IntCr = isAib ? (double)penalAmt : 0,
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
