using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.AccMasters.Loan;
using BankingPlatform.Infrastructure.Models.voucher;

namespace BankingPlatform.API.Service.Vouchers.Loan
{
    public class LoanRecoveryVoucherService
    {
        private readonly BankingDbContext _db;
        private readonly CommonFunctions _cf;

        private const int CAT_STD   = (int)Enums.IntCategory.StdInterest;        // 1 — unposted standard
        private const int CAT_PENAL = (int)Enums.IntCategory.PenalInterest;      // 2 — unposted penal/overdue
        private const int CAT_STDREC = (int)Enums.IntCategory.StdRecoverable;    // 3 — posted interest
        private const int CAT_OVDREC = (int)Enums.IntCategory.OverdueRecoverable;// 4 — overdue principal kist

        public LoanRecoveryVoucherService(BankingDbContext db, CommonFunctions cf)
        {
            _db = db;
            _cf = cf;
        }

        // ── Balance & Info ────────────────────────────────────────────────────────

        public async Task<LoanRecoveryBalanceDTO?> GetLoanBalanceAsync(int loanAccId, int branchId)
        {
            var acc = await _db.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == loanAccId && x.BranchId == branchId);
            if (acc == null) return null;

            // Member info
            Infrastructure.Models.member.Member? member = null;
            if (acc.MemberId.HasValue)
            {
                int memBrId = acc.MemberBranchID ?? branchId;
                member = await _db.member.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == acc.MemberId.Value && x.BranchId == memBrId);
            }

            // Loan terms (kist detail = loan product terms per account)
            var kist = await _db.accountkistdetail.AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == loanAccId && x.BrId == branchId);

            // Product definition — drives both interest calc method and loan interest type
            string intCalcMethod = "Schedule";
            int? actOnIntPosting = null;  // 1=AddInBalance, 2=Stand
            if (acc.GeneralProductId.HasValue)
            {
                var prodDef = await _db.loanproductdefinition.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ProductId == acc.GeneralProductId.Value && x.BrId == branchId);
                if (!string.IsNullOrWhiteSpace(prodDef?.IntCalcMethod))
                    intCalcMethod = prodDef.IntCalcMethod;
                actOnIntPosting = prodDef?.ActOnIntPosting;
            }
            bool isAddInBalance = actOnIntPosting == 1;

            // Opening balance
            var ob = await _db.loanaccopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccId == loanAccId && x.BranchId == branchId);

            // Opening balance detail rows (historical/migration data; AmountDr/Cr for OB movements,
            // IntDr/Cr for AddInBalance interest postings recorded in this table)
            var obDetails = await _db.loanaccountbalancedetail.AsNoTracking()
                .Where(x => x.AccountId == loanAccId && x.BrId == branchId)
                .ToListAsync();

            // Post-migration advancements and recoveries come from vouchercreditdebitdetails
            decimal advancedTotal = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.AccountId == loanAccId && x.BrId == branchId
                         && x.EntryStatus == Enums.VoucherStatus.LA.ToString()
                         && (x.VoucherStatus == "V" || x.VoucherStatus == "A"))
                .SumAsync(x => x.VoucherAmount);

            decimal recoveredTotal = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.AccountId == loanAccId && x.BrId == branchId
                         && x.EntryStatus == Enums.VoucherStatus.LR.ToString()
                         && (x.VoucherStatus == "V" || x.VoucherStatus == "A"))
                .SumAsync(x => x.VoucherAmount);

            decimal openingPrincipal = ob?.TotalBalance ?? 0m;
            decimal principalBal = openingPrincipal
                                 + obDetails.Sum(x => x.AmountDr)
                                 - obDetails.Sum(x => x.AmountCr)
                                 + advancedTotal
                                 - recoveredTotal;
            // For AddInBalance: interest is embedded in the balance; IntDr/IntCr rows are recorded
            // in loanaccountbalancedetail by the interest posting service
            if (isAddInBalance)
                principalBal += obDetails.Sum(x => x.IntDr) - obDetails.Sum(x => x.IntCr);
            principalBal = Math.Max(0, principalBal);

            // Opening interest (migrated/imported balances)
            decimal openStdInt = (ob?.OpenInt > 0 && ob!.OpenIntType == "Dr")
                ? (decimal)ob.OpenInt!.Value : 0m;
            decimal openOvdInt = (ob?.OpenOverInt > 0 && ob!.OpenOverIntType == "Dr")
                ? (decimal)ob.OpenOverInt!.Value : 0m;

            // ── AddInBalance short-circuit ────────────────────────────────────────
            // For AddInBalance loans, interest is baked into the principal — no voucherrecintdetail.
            // Outstanding = principal balance only; no interest category breakdown.
            if (isAddInBalance)
            {
                string recSeqAib = "4,3,2,1";
                if (acc.GeneralProductId.HasValue)
                {
                    var prodRecAib = await _db.loanproductrecovery.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.ProductId == acc.GeneralProductId.Value && x.BrId == branchId);
                    if (!string.IsNullOrWhiteSpace(prodRecAib?.RecoverySeq))
                        recSeqAib = prodRecAib.RecoverySeq;
                }
                return new LoanRecoveryBalanceDTO
                {
                    LoanAccId                    = loanAccId,
                    AccountNumber                = acc.AccountNumber,
                    MemberName                   = member?.MemberName ?? acc.AccountName ?? string.Empty,
                    MemberRelativeName           = member?.RelativeName,
                    PhoneNo                      = member?.PhoneNo1,
                    MembershipNo                 = member?.PermanentMembershipNo ?? member?.NominalMembershipNo,
                    LoanNo                       = kist?.LoanNo,
                    LoanDate                     = kist?.LoanDate,
                    StandardInterestRate         = kist?.StandardInterestRate,
                    OverdueInterestRate          = kist?.OverdueInterestRate,
                    KistAmount                   = kist?.KistAmount.HasValue == true ? (decimal)kist.KistAmount!.Value : null,
                    PrincipalBalance             = principalBal,
                    StdInterestOutstanding       = 0,
                    PenalInterestOutstanding     = 0,
                    StdRecoverableOutstanding    = 0,
                    OverdueRecoverableOutstanding= 0,
                    TotalOutstanding             = principalBal,
                    RecoverySeq                  = recSeqAib,
                    SavingBalance                = 0,
                    OverdueInstallments          = 0,
                    OverduePrincipal             = 0,
                    InterestCalcFromDate         = null,
                    InterestCalcToDate           = DateTime.Today,
                    IntCalcMethod                = intCalcMethod,
                    ActOnIntPosting              = actOnIntPosting,
                    IntRecDetail                 = new List<IntRecDetailRowDTO>(),
                };
            }

            // ── VoucherRecIntDetail — primary interest ledger (Stand loans only) ──
            // Cat 1/2 IntDr = formally posted interest (IP voucher) OR auto-post during direct recovery
            // Cat 1/2 IntCr = recovery of unposted interest (auto-post path: IntDr and IntCr both written)
            // Cat 3   IntCr = recovery against formally posted interest (posted-then-recover path)
            var intEntries = await _db.voucherrecintdetail.AsNoTracking()
                .Where(x => x.AccId == loanAccId && x.BrId == branchId)
                .OrderBy(x => x.EntryDate)
                .ThenBy(x => x.Id)
                .ToListAsync();

            // All Cat 1 IntDr (IP voucher formal postings + auto-post amounts from direct recovery)
            decimal postedStdInt   = (decimal)intEntries.Where(x => x.IntCatId == CAT_STD).Sum(x => x.IntDr);
            // All Cat 2 IntDr (same dual source as above)
            decimal postedPenalInt = (decimal)intEntries.Where(x => x.IntCatId == CAT_PENAL).Sum(x => x.IntDr);
            decimal totalPosted    = postedStdInt + postedPenalInt;

            // Cat 3 IntCr = recoveries against formally posted interest (posted-then-recover path)
            decimal postedRecovered = (decimal)intEntries.Where(x => x.IntCatId == CAT_STDREC).Sum(x => x.IntCr);

            // Cat 1/2 IntCr = the recovery side of auto-post entries (direct recovery of unposted).
            // These exist ONLY in auto-post entries (IntDr == IntCr), so they cancel out the auto-post
            // IntDr that inflated totalPosted. Must be subtracted from stdRec to avoid overstating it.
            decimal unpostedRecStd   = (decimal)intEntries.Where(x => x.IntCatId == CAT_STD).Sum(x => x.IntCr);
            decimal unpostedRecPenal = (decimal)intEntries.Where(x => x.IntCatId == CAT_PENAL).Sum(x => x.IntCr);
            decimal unpostedRecovered = unpostedRecStd + unpostedRecPenal;

            // Cat 4 IntDr/IntCr = overdue kist principal posted/recovered
            decimal ovdRecPosted    = (decimal)intEntries.Where(x => x.IntCatId == CAT_OVDREC).Sum(x => x.IntDr);
            decimal ovdRecRecovered = (decimal)intEntries.Where(x => x.IntCatId == CAT_OVDREC).Sum(x => x.IntCr);

            // Cat 3 (StdRecoverable) = all formally posted (std + penal) minus already recovered.
            // Subtract unpostedRecovered to cancel auto-post entries whose IntDr inflated totalPosted
            // but whose IntCr means the interest was immediately recovered (net effect = 0 on this pool).
            decimal stdRec = Math.Max(0, totalPosted + openStdInt - postedRecovered - unpostedRecovered);

            // Net overdue recoverable
            decimal ovdRec = Math.Max(0, ovdRecPosted + openOvdInt - ovdRecRecovered);

            // ── Kist schedule for overdue/dynamic interest ────────────────────────
            var kistSchedule = await _db.accountkistschedule.AsNoTracking()
                .Where(x => x.LoanAccId == loanAccId)
                .OrderBy(x => x.KistNumber)
                .ToListAsync();

            DateTime today = DateTime.Today;

            var overdueKists = kistSchedule
                .Where(x => x.Date.HasValue && x.Date.Value.Date < today)
                .ToList();

            int overdueInstallments = overdueKists.Count;
            decimal overduePrincipal = overdueKists.Sum(x => x.PrincipalAmt ?? 0m);

            // Last FORMAL interest posting date — exclude auto-post entries (IntCr > 0 on Cat 1/2
            // means it is an auto-post+recover entry from direct recovery, not an IP voucher entry).
            // Including auto-post dates would advance calcFromDate and hide remaining unposted interest.
            DateTime? lastPostDate = intEntries.Any(x =>
                    (x.IntCatId == CAT_STD || x.IntCatId == CAT_PENAL) && x.IntCr == 0)
                ? intEntries
                    .Where(x => (x.IntCatId == CAT_STD || x.IntCatId == CAT_PENAL) && x.IntCr == 0)
                    .Max(x => (DateTime?)x.EntryDate)
                : null;

            DateTime calcFromDate = lastPostDate?.Date ?? kist?.LoanDate ?? ob?.OverDueDate ?? today;
            DateTime calcToDate   = today;

            // ── Dynamic unposted interest (not yet formally posted) ───────────────
            decimal dynStdInt   = 0m;
            decimal dynPenalInt = 0m;

            if (intCalcMethod == "Schedule" && kistSchedule.Any())
            {
                // Schedule-based: sum standard InterestAmt of all overdue kists.
                // Subtract only postedStdInt (Cat 1 IntDr) — not totalPosted — because scheduleIntDue
                // is standard interest only and penal is computed separately below.
                decimal scheduleIntDue = overdueKists.Sum(x => x.InterestAmt ?? 0m) + openStdInt;
                dynStdInt = Math.Max(0, scheduleIntDue - postedStdInt);

                // WO (without-interest) schedule: InterestAmt is 0 on every installment but rate
                // is still set — fall back to Balance method for standard interest calculation.
                if (dynStdInt == 0 && kist != null && (kist.StandardInterestRate ?? 0) > 0 && principalBal > 0)
                {
                    int days = Math.Max(0, (calcToDate - calcFromDate).Days);
                    decimal rawStd = Math.Round(
                        principalBal * (decimal)kist.StandardInterestRate!.Value / 100m * days / 365m, 2);
                    // Use postedStdInt only (Cat 1 IntDr) — not totalPosted which would also subtract
                    // penal amounts from the standard interest calculation, understating dynStdInt.
                    dynStdInt = Math.Max(0, rawStd + openStdInt - postedStdInt);
                }

                // Overdue (penal) interest: on overdue principal at overdue rate since due date
                if (kist != null && (kist.OverdueInterestRate ?? 0) > 0 && overduePrincipal > 0)
                {
                    decimal rawPenal = 0m;
                    foreach (var ok in overdueKists)
                    {
                        if (ok.Date == null) continue;
                        int days = Math.Max(0, (today - ok.Date.Value.Date).Days);
                        rawPenal += Math.Round(
                            (ok.PrincipalAmt ?? 0m) * (decimal)kist.OverdueInterestRate!.Value / 100m * days / 365m, 2);
                    }
                    dynPenalInt = Math.Max(0, rawPenal - postedPenalInt);
                }
            }
            else if (principalBal > 0 && kist != null && (kist.StandardInterestRate ?? 0) > 0)
            {
                // Balance or MinBalance method: interest on outstanding principal for the period
                int days = Math.Max(0, (calcToDate - calcFromDate).Days);

                decimal effectivePrincipal;
                if (intCalcMethod == "MinBalance")
                    effectivePrincipal = CalculateMinimumBalance(openingPrincipal, obDetails, calcFromDate, calcToDate);
                else
                    effectivePrincipal = principalBal; // Balance method: current outstanding

                decimal rawStd = Math.Round(
                    effectivePrincipal * (decimal)kist.StandardInterestRate!.Value / 100m * days / 365m, 2);
                // Use postedStdInt (Cat 1 IntDr only) — not totalPosted which mixes penal amounts
                // into the standard interest offset, causing dynStdInt to be understated.
                dynStdInt = Math.Max(0, rawStd + openStdInt - postedStdInt);

                // Overdue penal on overdue principal
                if ((kist.OverdueInterestRate ?? 0) > 0 && overduePrincipal > 0)
                {
                    foreach (var ok in overdueKists)
                    {
                        if (ok.Date == null) continue;
                        int overDays = Math.Max(0, (today - ok.Date.Value.Date).Days);
                        dynPenalInt += Math.Round(
                            (ok.PrincipalAmt ?? 0m) * (decimal)kist.OverdueInterestRate!.Value / 100m * overDays / 365m, 2);
                    }
                    dynPenalInt = Math.Max(0, dynPenalInt - postedPenalInt);
                }
            }

            // Recovery sequence from product
            string recSeq = "4,3,2,1";
            if (acc.GeneralProductId.HasValue)
            {
                var prodRec = await _db.loanproductrecovery.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ProductId == acc.GeneralProductId.Value && x.BrId == branchId);
                if (!string.IsNullOrWhiteSpace(prodRec?.RecoverySeq))
                    recSeq = prodRec.RecoverySeq;
            }

            decimal totalOut = principalBal + dynStdInt + dynPenalInt + stdRec + ovdRec;

            // Map voucherrecintdetail rows to DTOs for the UI interest detail grid
            var catNames = new Dictionary<int, string>
            {
                [CAT_STD]    = "Standard Interest",
                [CAT_PENAL]  = "Penal Interest",
                [CAT_STDREC] = "Std. Recoverable",
                [CAT_OVDREC] = "Overdue Recoverable",
            };
            var intRecDetail = intEntries.Select(e => new IntRecDetailRowDTO
            {
                Id         = e.Id,
                EntryDate  = e.EntryDate,
                IntCatId   = e.IntCatId,
                IntCatName = catNames.GetValueOrDefault(e.IntCatId, $"Cat {e.IntCatId}"),
                IntDr      = e.IntDr,
                IntCr      = e.IntCr,
                VoucherNo  = e.VoucherNo,
            }).ToList();

            return new LoanRecoveryBalanceDTO
            {
                LoanAccId                    = loanAccId,
                AccountNumber                = acc.AccountNumber,
                MemberName                   = member?.MemberName ?? acc.AccountName ?? string.Empty,
                MemberRelativeName           = member?.RelativeName,
                PhoneNo                      = member?.PhoneNo1,
                MembershipNo                 = member?.PermanentMembershipNo ?? member?.NominalMembershipNo,
                LoanNo                       = kist?.LoanNo,
                LoanDate                     = kist?.LoanDate,
                StandardInterestRate         = kist?.StandardInterestRate,
                OverdueInterestRate          = kist?.OverdueInterestRate,
                KistAmount                   = kist?.KistAmount.HasValue == true ? (decimal)kist.KistAmount!.Value : null,
                PrincipalBalance             = principalBal,
                StdInterestOutstanding       = dynStdInt,       // Cat 1: unposted standard interest
                PenalInterestOutstanding     = dynPenalInt,     // Cat 2: unposted penal interest
                StdRecoverableOutstanding    = stdRec,          // Cat 3: formally posted, not yet recovered
                OverdueRecoverableOutstanding= ovdRec,          // Cat 4: overdue kist principal posted
                TotalOutstanding             = totalOut,
                RecoverySeq                  = recSeq,
                SavingBalance                = 0,
                OverdueInstallments          = overdueInstallments,
                OverduePrincipal             = overduePrincipal,
                InterestCalcFromDate         = calcFromDate == today ? null : calcFromDate,
                InterestCalcToDate           = calcToDate,
                IntCalcMethod                = intCalcMethod,
                ActOnIntPosting              = actOnIntPosting,
                IntRecDetail                 = intRecDetail,
            };
        }

        public async Task<List<LoanAccountSearchDTO>> SearchLoanAccountsAsync(int branchId, string query)
        {
            var q = query.Trim().ToLower();
            return await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                         && x.AccTypeId == (int)Enums.AccountTypes.Loan
                         && !x.IsAccClosed
                         && (x.AccountNumber.ToLower().Contains(q)
                             || (x.AccountName != null && x.AccountName.ToLower().Contains(q))))
                .OrderBy(x => x.AccountNumber)
                .Take(20)
                .Select(x => new LoanAccountSearchDTO
                {
                    AccountId     = x.ID,
                    AccountNumber = x.AccountNumber,
                    AccountName   = x.AccountName ?? string.Empty,
                    MemberId      = x.MemberId,
                })
                .ToListAsync();
        }

        public async Task<List<KistScheduleDTO>> GetKistScheduleAsync(int loanAccId, int branchId)
        {
            return await _db.accountkistschedule.AsNoTracking()
                .Where(x => x.LoanAccId == loanAccId)
                .OrderBy(x => x.KistNumber)
                .Select(x => new KistScheduleDTO
                {
                    KistNumber   = x.KistNumber ?? 0,
                    Date         = x.Date,
                    KistAmount   = x.KistAmount ?? 0,
                    PrincipalAmt = x.PrincipalAmt ?? 0,
                    InterestAmt  = x.InterestAmt ?? 0,
                })
                .ToListAsync();
        }

        // ── Save Recovery ─────────────────────────────────────────────────────────

        public async Task<(string result, int voucherNo)> AddLoanRecoveryVoucherAsync(LoanRecoveryVoucherDTO dto)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (dto.LoanAccountId <= 0 || dto.TotalAmount <= 0 || dto.DebitItems.Count == 0)
                    return ("Invalid voucher data.", 0);

                decimal debitTotal = dto.DebitItems.Sum(x => x.Amount);
                if (Math.Abs(debitTotal - dto.TotalAmount) > 0.01m)
                    return ("Total debit amount must equal the recovery amount.", 0);

                var bal = await GetLoanBalanceAsync(dto.LoanAccountId, dto.BrId);
                if (bal == null)
                    return ("Loan account not found.", 0);
                if (bal.TotalOutstanding <= 0)
                    return ("No outstanding balance — recovery is not allowed.", 0);
                if (dto.TotalAmount > bal.TotalOutstanding + 0.01m)
                    return ($"Recovery ({dto.TotalAmount:N2}) exceeds outstanding balance ({bal.TotalOutstanding:N2}).", 0);

                bool isAddInBalance = bal.ActOnIntPosting == 1;

                decimal principalRec;
                Dictionary<int, decimal> intRec;
                if (isAddInBalance)
                {
                    // AddInBalance: no interest allocation; all recovery reduces the principal balance
                    principalRec = Math.Min(dto.TotalAmount, bal.PrincipalBalance);
                    intRec = new Dictionary<int, decimal>();
                }
                else
                {
                    (principalRec, intRec) = Allocate(dto.TotalAmount, bal);
                }

                // Voucher header
                int nextVrNo   = await _cf.GetLatestVoucherNo(dto.BrId, dto.VoucherDate);
                bool autoVerify = await _cf.IsAutoVerification(dto.BrId);
                string vrStatus = autoVerify ? "V" : "A";
                int userId      = int.Parse(_cf.GetCurrentUserId()!);
                DateTime vrDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narr     = string.IsNullOrWhiteSpace(dto.Narration)
                    ? $"Loan Recovery - {dto.VoucherDate:dd-MMM-yyyy}"
                    : dto.Narration;

                var voucher = new Voucher
                {
                    BrID             = dto.BrId,
                    VoucherNo        = nextVrNo,
                    VoucherType      = (int)Enums.VoucherType.Loan,
                    VoucherSubType   = (int)Enums.VoucherSubType.LoanRecovery,
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

                int voucherId  = voucher.Id;
                decimal intTotal = intRec.Values.Sum();
                int row = 1;

                // Cr entry — loan account (principal in VoucherAmount, total interest in IntCr)
                long loanHead = await _cf.GetAccountHeadCodeFromAccId(dto.LoanAccountId, dto.BrId);

                var crEntry = new VoucherCreditDebitDetails
                {
                    BrId             = dto.BrId,
                    VoucherID        = voucherId,
                    AccountId        = dto.LoanAccountId,
                    AccHeadCode      = loanHead,
                    VoucherAmount    = principalRec,
                    VoucherEntryType = "Cr",
                    EntryStatus      = Enums.VoucherStatus.LR.ToString(),
                    Narration        = narr,
                    VoucherStatus    = vrStatus,
                    ValueDate        = valDate,
                    VoucherSeqNo     = row,
                    IntCr            = intTotal > 0 ? intTotal : null,
                    IntDr            = null,
                    ExpenseAmt       = 0,
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await _db.vouchercreditdebitdetails.AddAsync(crEntry);
                await _db.SaveChangesAsync();
                int crId = crEntry.Id;
                row++;

                // Dr entries — debit accounts (cash / saving / bank)
                foreach (var item in dto.DebitItems)
                {
                    string itNarr = string.IsNullOrWhiteSpace(item.Narration) ? narr : item.Narration;
                    long drHead   = await _cf.GetAccountHeadCodeFromAccId(item.AccountId, dto.BrId);
                    var drEntry = new VoucherCreditDebitDetails
                    {
                        BrId             = dto.BrId,
                        VoucherID        = voucherId,
                        AccountId        = item.AccountId,
                        AccHeadCode      = drHead,
                        VoucherAmount    = item.Amount,
                        VoucherEntryType = "Dr",
                        EntryStatus      = Enums.VoucherStatus.Dr.ToString(),
                        Narration        = itNarr,
                        VoucherStatus    = vrStatus,
                        ValueDate        = valDate,
                        VoucherSeqNo     = row,
                        IntDr = null, IntCr = null,
                        ExpenseAmt = 0,
                        HCL1 = 0, HCL2 = 0, HCL3 = 0,
                    };
                    await _db.vouchercreditdebitdetails.AddAsync(drEntry);
                    row++;
                }

                // ── VoucherRecIntDetail — interest ledger entries ─────────────────
                // Rule:
                //   Cat 1 (StdInterest) recovered  → auto-post: write IntDr (posting) + IntCr (recovery) both
                //   Cat 2 (PenalInterest) recovered → auto-post: write IntDr (posting) + IntCr (recovery) both
                //   Cat 3 (StdRecoverable) recovered→ only IntCr (already formally posted via interest-posting voucher)
                //   Cat 4 (OverdueRec) recovered    → only IntCr (already formally posted)
                foreach (var (catId, amt) in intRec)
                {
                    if (amt <= 0) continue;

                    bool isUnposted = catId == CAT_STD || catId == CAT_PENAL;

                    if (isUnposted)
                    {
                        // Auto-post (IntDr) and recover (IntCr) in same entry for audit trail
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId              = dto.BrId,
                            VAccCrDrId        = crId,
                            VoucherId         = voucherId,
                            VoucherNo         = nextVrNo,
                            EntryDate         = vrDate,
                            ValueDate         = valDate,
                            IntCatId          = catId,
                            Pamt              = (double)principalRec,
                            AccId             = dto.LoanAccountId,
                            IntDr             = (double)amt, // posting
                            IntCr             = (double)amt, // recovery (net = 0, fully recovered)
                            VoucherMainStatus = vrStatus,
                        });
                    }
                    else
                    {
                        // Cat 3/4: formally posted interest being recovered
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId              = dto.BrId,
                            VAccCrDrId        = crId,
                            VoucherId         = voucherId,
                            VoucherNo         = nextVrNo,
                            EntryDate         = vrDate,
                            ValueDate         = valDate,
                            IntCatId          = catId,
                            Pamt              = (double)principalRec,
                            AccId             = dto.LoanAccountId,
                            IntDr             = 0,
                            IntCr             = (double)amt,
                            VoucherMainStatus = vrStatus,
                        });
                    }
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

        // ── Helpers ───────────────────────────────────────────────────────────────

        // Allocates recovery amount to interest categories (per recovery sequence), then to principal.
        private static (decimal Principal, Dictionary<int, decimal> Interest) Allocate(
            decimal total, LoanRecoveryBalanceDTO bal)
        {
            var outstanding = new Dictionary<int, decimal>
            {
                [CAT_STD]    = bal.StdInterestOutstanding,
                [CAT_PENAL]  = bal.PenalInterestOutstanding,
                [CAT_STDREC] = bal.StdRecoverableOutstanding,
                [CAT_OVDREC] = bal.OverdueRecoverableOutstanding,
            };

            var seq = bal.RecoverySeq
                .Split(',')
                .Select(s => int.TryParse(s.Trim(), out int v) ? v : 0)
                .Where(v => v >= 1 && v <= 4)
                .ToList();

            var intRec  = new Dictionary<int, decimal>();
            decimal rem = total;

            foreach (int catId in seq)
            {
                if (rem <= 0) break;
                decimal out_ = outstanding.GetValueOrDefault(catId);
                if (out_ <= 0) continue;
                decimal rec  = Math.Min(rem, out_);
                intRec[catId] = rec;
                rem -= rec;
            }

            decimal principalRec = Math.Min(rem, bal.PrincipalBalance);
            return (principalRec, intRec);
        }

        // Reconstructs the daily principal balance from opening balance + dated movements,
        // then returns the minimum balance in [fromDate, toDate]. Used for MinBalance method.
        private static decimal CalculateMinimumBalance(
            decimal openingBalance,
            List<LoanAccountBalanceDetail> moves,
            DateTime fromDate,
            DateTime toDate)
        {
            // Build a daily balance time series
            decimal running = openingBalance;
            decimal minimum = openingBalance;

            var grouped = moves
                .Where(m => m.Date.Date <= toDate.Date)
                .GroupBy(m => m.Date.Date)
                .OrderBy(g => g.Key);

            foreach (var day in grouped)
            {
                running += day.Sum(m => m.AmountDr) - day.Sum(m => m.AmountCr);
                if (day.Key >= fromDate.Date)
                    minimum = Math.Min(minimum, running);
            }

            return Math.Max(0, minimum);
        }
    }
}
