using BankingPlatform.API.Common;
using BankingPlatform.API.DTO.InterBranch;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Services;
using BankingPlatform.API.Service.Vouchers.Loan;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterBranch
{
    /// <summary>
    /// IB Loan Recovery — mirrors IB Saving Deposit flow:
    ///   Cash is received at source/HO; loan account is at dest branch.
    ///   Step 1 (source): Dr=Cash/Saving (multiple), Cr=IB-Ref
    ///   Step 2 (HO, BranchToBranch): Dr=Source-Ref, Cr=Dest-Ref
    ///   Step 3 (dest): Dr=HO-Ref, Cr=LoanAccount + interest entries
    /// </summary>
    public class IBLoanRecoveryService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _cf;
        private readonly MemberService _memberService;
        private readonly LoanRecoveryVoucherService _loanRecService;

        public IBLoanRecoveryService(
            BankingDbContext context,
            CommonFunctions cf,
            MemberService memberService,
            LoanRecoveryVoucherService loanRecService)
        {
            _context = context;
            _cf = cf;
            _memberService = memberService;
            _loanRecService = loanRecService;
        }

        // ── Step 1 — originating branch receives cash ────────────────────────────
        public async Task<(bool success, string message, int ibVoucherId)> CreateStep1Async(IBLoanRecoveryStep1DTO dto)
        {
            if (dto.TotalAmount <= 0)
                return (false, "Amount must be greater than zero.", 0);
            if (dto.DestBrId == dto.BrId)
                return (false, "Destination branch cannot be the same as originating branch.", 0);
            if (dto.DebitItems == null || dto.DebitItems.Count == 0)
                return (false, "At least one debit account is required.", 0);
            var debitSum = dto.DebitItems.Sum(x => x.Amount);
            if (Math.Abs(debitSum - dto.TotalAmount) > 0.01m)
                return (false, "Total debit amount must equal the recovery amount.", 0);

            string flowType = dto.FlowType == "HOToBranch" ? "HOToBranch" : "BranchToBranch";
            int subType = flowType == "HOToBranch"
                ? (int)Enums.VoucherSubType.IBHOLoanRecStep1
                : (int)Enums.VoucherSubType.IBBrLoanRecStep1;

            // CrAccId = IB-Ref account (must be in otherbranchaccounts at originating branch)
            var refAcc = await _context.otherbranchaccounts
                .FirstOrDefaultAsync(x => x.BrId == dto.BrId && x.AccId == dto.CrAccId);
            if (refAcc == null)
                return (false, "Credit account is not a configured IB reference account for this branch.", 0);

            var destAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.DestAccId && x.BranchId == dto.DestBrId);
            if (destAcc == null)
                return (false, "Loan account not found at the specified destination branch.", 0);
            if (destAcc.AccTypeId != (int)Enums.AccountTypes.Loan)
                return (false, "Destination account must be a Loan account.", 0);

            var crAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.CrAccId && x.BranchId == dto.BrId);
            if (crAcc == null)
                return (false, "IB reference (credit) account not found at originating branch.", 0);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int branchId = dto.BrId;
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate   = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narration = dto.Narration ?? $"IB Loan Recovery for A/c {dto.DestAccNo} ({dto.DestAccName})";
                string userId    = dto.UserId ?? _cf.GetCurrentUserId() ?? "0";

                using var _vrLease = await _cf.ReserveVoucherNoAsync(branchId, voucherDate);
                int nextVrNo = _vrLease.VoucherNo;
                bool isAutoVerification = await _cf.IsAutoVerification(branchId);
                string voucherStatus = isAutoVerification ? "V" : "A";

                // Voucher header — use first debit account as DebitAccountId for display
                var voucherDTO = new VoucherDTO
                {
                    ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate      = voucherDate,
                    AddedBy          = int.Parse(userId),
                    BrID             = branchId,
                    ModifiedBy       = 0,
                    VerifiedBy       = isAutoVerification ? int.Parse(userId) : 0,
                    VoucherNarration = narration,
                    OtherBrID        = 0,
                    VoucherNo        = nextVrNo,
                    VoucherStatus    = voucherStatus,
                    VoucherType      = (int)Enums.VoucherType.InterBranch,
                    VoucherSubType   = subType,
                    TotalDebit       = dto.TotalAmount,
                    DebitAccountId   = dto.DebitItems[0].AccountId,
                    CreditAccountId  = dto.CrAccId,
                };

                var voucherEntity = _memberService.MapToEntity(voucherDTO);
                await _context.voucher.AddAsync(voucherEntity);
                await _context.SaveChangesAsync();

                long crHeadCode = await _cf.GetAccountHeadCodeFromAccId(dto.CrAccId, branchId);

                // Cr entry — IB-Ref account
                int row = 1;
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(
                        crHeadCode, dto.CrAccId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), narration,
                        dto.TotalAmount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
                row++;

                // Dr entries — multiple cash/saving accounts
                long firstDrHead = 0;
                foreach (var item in dto.DebitItems)
                {
                    string itNarr = string.IsNullOrWhiteSpace(item.Narration) ? narration : item.Narration;
                    long drHead = await _cf.GetAccountHeadCodeFromAccId(item.AccountId, branchId);
                    if (row == 2) firstDrHead = drHead;
                    await _context.vouchercreditdebitdetails.AddAsync(
                        _memberService.voucherCreditDebitDetails(
                            drHead, item.AccountId, branchId,
                            Enums.VoucherStatus.Dr.ToString(), itNarr,
                            item.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
                    row++;
                }
                await _context.SaveChangesAsync();

                DateTime.TryParse(dto.WorkingDate, out DateTime parsedWorkingDate);

                var ibRecord = new InterBranchVoucher
                {
                    VoucherType  = "IBLoanRecovery",
                    FlowType     = flowType,
                    Amount       = dto.TotalAmount,
                    Narration    = narration,
                    EntryDate    = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    Status       = "Pending",
                    FromBrId     = dto.BrId,
                    DestBrId     = dto.DestBrId,
                    DestAccId    = dto.DestAccId,
                    DestAccNo    = dto.DestAccNo,
                    DestAccName  = dto.DestAccName,
                    DestMemberId = dto.DestMemberId,

                    Step1VoucherId   = voucherEntity.Id,
                    Step1BrId        = dto.BrId,
                    // Store first Dr as Step1Dr for display; Cr = IB-Ref
                    Step1DrAccId     = dto.DebitItems[0].AccountId,
                    Step1DrAccName   = dto.DebitItems.Count == 1
                        ? (await _context.accountmaster.AsNoTracking()
                            .Where(x => x.ID == dto.DebitItems[0].AccountId && x.BranchId == branchId)
                            .Select(x => x.AccountName).FirstOrDefaultAsync() ?? "")
                        : $"Multiple ({dto.DebitItems.Count} accounts)",
                    Step1DrHeadCode  = firstDrHead,
                    Step1CrAccId     = dto.CrAccId,
                    Step1CrAccName   = crAcc.AccountName,
                    Step1CrHeadCode  = crHeadCode,
                    Step1Date        = voucherDate,
                    Step1WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate,
                    Step1UserId      = userId,
                };

                await _context.interbranchvoucher.AddAsync(ibRecord);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "IB loan recovery voucher recorded successfully.", ibRecord.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while saving the IB loan recovery voucher.", 0);
            }
        }

        // ── Step 2 — HO settles (BranchToBranch only) ────────────────────────────
        // Dr=Source-Ref, Cr=Dest-Ref  (same direction as Saving Deposit HO step)
        public async Task<(bool success, string message)> CreateHOSettlementAsync(int ibVoucherId, IBSavingDepositStep2DTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ibRecord = await _context.interbranchvoucher
                    .FromSqlInterpolated($"SELECT * FROM interbranchvoucher WHERE id = {ibVoucherId} FOR UPDATE")
                    .FirstOrDefaultAsync();
                if (ibRecord == null) return (false, "Inter-branch voucher not found.");
                if (ibRecord.Step2VoucherId.HasValue) return (false, "HO has already settled this voucher.");

                // Dr=Source-Ref, Cr=Dest-Ref
                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == dto.HoBrId && x.OtherBrId == ibRecord.FromBrId);
                if (drMapping == null)
                    return (false, $"No reference account configured at HO for source branch (ID {ibRecord.FromBrId}).");

                var crMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == dto.HoBrId && x.OtherBrId == ibRecord.DestBrId);
                if (crMapping == null)
                    return (false, $"No reference account configured at HO for destination branch (ID {ibRecord.DestBrId}).");

                var drAcc = await _context.accountmaster.FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == dto.HoBrId);
                var crAcc = await _context.accountmaster.FirstOrDefaultAsync(x => x.ID == crMapping.AccId && x.BranchId == dto.HoBrId);
                if (drAcc == null || crAcc == null)
                    return (false, "One or more reference accounts not found at HO.");

                int branchId = dto.HoBrId;
                DateTime voucherDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                DateTime valueDate   = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
                string narration = !string.IsNullOrWhiteSpace(dto.Narration)
                    ? dto.Narration
                    : ibRecord.Narration ?? $"IB Loan Recovery Settlement — Br{ibRecord.FromBrId} → Br{ibRecord.DestBrId}";
                string userId = dto.UserId ?? _cf.GetCurrentUserId() ?? "0";

                using var _vrLease = await _cf.ReserveVoucherNoAsync(branchId, voucherDate);
                int nextVrNo = _vrLease.VoucherNo;
                bool isAutoVerification = await _cf.IsAutoVerification(branchId);
                string voucherStatus = isAutoVerification ? "V" : "A";

                var voucherDTO = new VoucherDTO
                {
                    ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate      = voucherDate,
                    AddedBy          = int.Parse(userId),
                    BrID             = branchId,
                    ModifiedBy       = 0,
                    VerifiedBy       = isAutoVerification ? int.Parse(userId) : 0,
                    VoucherNarration = narration,
                    OtherBrID        = 0,
                    VoucherNo        = nextVrNo,
                    VoucherStatus    = voucherStatus,
                    VoucherType      = (int)Enums.VoucherType.InterBranch,
                    VoucherSubType   = (int)Enums.VoucherSubType.IBBrLoanRecStep2,
                    TotalDebit       = ibRecord.Amount,
                    DebitAccountId   = drMapping.AccId,
                    CreditAccountId  = crMapping.AccId,
                };

                var voucherEntity = _memberService.MapToEntity(voucherDTO);
                await _context.voucher.AddAsync(voucherEntity);
                await _context.SaveChangesAsync();

                long drHeadCode = await _cf.GetAccountHeadCodeFromAccId(drMapping.AccId, branchId);
                long crHeadCode = await _cf.GetAccountHeadCodeFromAccId(crMapping.AccId, branchId);

                int row = 1;
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(drHeadCode, drMapping.AccId, branchId,
                        Enums.VoucherStatus.Dr.ToString(), narration, ibRecord.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
                row++;
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(crHeadCode, crMapping.AccId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), narration, ibRecord.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
                await _context.SaveChangesAsync();

                DateTime.TryParse(dto.WorkingDate, out DateTime parsedWorkingDate);

                bool step3Done = ibRecord.Step3VoucherId.HasValue;
                ibRecord.Step2VoucherId   = voucherEntity.Id;
                ibRecord.Step2BrId        = branchId;
                ibRecord.Step2DrAccId     = drMapping.AccId;
                ibRecord.Step2DrAccName   = drAcc.AccountName;
                ibRecord.Step2DrHeadCode  = drHeadCode;
                ibRecord.Step2CrAccId     = crMapping.AccId;
                ibRecord.Step2CrAccName   = crAcc.AccountName;
                ibRecord.Step2CrHeadCode  = crHeadCode;
                ibRecord.Step2Date        = voucherDate;
                ibRecord.Step2WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate;
                ibRecord.Step2UserId      = userId;
                ibRecord.Status           = step3Done ? "Completed" : "HOConfirmed";

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "HO loan recovery settlement completed.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred during HO settlement.");
            }
        }

        // ── Step 3 — destination branch applies recovery to loan account ─────────
        public async Task<(bool success, string message)> CreateFinalStepAsync(int ibVoucherId, IBLoanRecoveryFinalStepDTO dto)
        {
            var ibRecord = await _context.interbranchvoucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == ibVoucherId);
            if (ibRecord == null) return (false, "Inter-branch voucher not found.");
            if (ibRecord.Step3VoucherId.HasValue) return (false, "This voucher has already been completed.");

            return ibRecord.FlowType == "HOToBranch"
                ? await CreateHOToBranchFinalAsync(ibVoucherId, dto)
                : await CreateBranchToBranchFinalAsync(ibVoucherId, dto);
        }

        private async Task<(bool success, string message)> CreateHOToBranchFinalAsync(int ibVoucherId, IBLoanRecoveryFinalStepDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ibRecord = await _context.interbranchvoucher
                    .FromSqlInterpolated($"SELECT * FROM interbranchvoucher WHERE id = {ibVoucherId} FOR UPDATE")
                    .FirstOrDefaultAsync();
                if (ibRecord == null) return (false, "Inter-branch voucher not found.");
                if (ibRecord.Step3VoucherId.HasValue) return (false, "This voucher has already been completed.");

                int destBrId = dto.DestBrId;

                // Dr = HO-Ref at dest (otherbranchaccounts where brId=dest, otherbrid=fromBr(HO))
                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == ibRecord.FromBrId);
                if (drMapping == null)
                    return (false, "No HO reference account configured at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "HO reference account not found at destination branch.");

                return await WriteLoanRecoveryFinalVoucherAsync(ibRecord, destBrId,
                    drMapping.AccId, drAcc.AccountName,
                    (int)Enums.VoucherSubType.IBHOLoanRecStep2,
                    dto, transaction);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB loan recovery.");
            }
        }

        private async Task<(bool success, string message)> CreateBranchToBranchFinalAsync(int ibVoucherId, IBLoanRecoveryFinalStepDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ibRecord = await _context.interbranchvoucher
                    .FromSqlInterpolated($"SELECT * FROM interbranchvoucher WHERE id = {ibVoucherId} FOR UPDATE")
                    .FirstOrDefaultAsync();
                if (ibRecord == null) return (false, "Inter-branch voucher not found.");
                if (ibRecord.Step3VoucherId.HasValue) return (false, "Destination branch has already completed this voucher.");

                int destBrId = dto.DestBrId;

                // For dest branch, Dr = HO-Ref (otherbranchaccounts where otherbrid=step2 branch or HO)
                int hoBrId = ibRecord.Step2BrId
                    ?? (await _context.otherbranchaccounts
                           .Where(x => x.BrId == destBrId)
                           .Select(x => (int?)x.OtherBrId)
                           .FirstOrDefaultAsync()) ?? 0;
                if (hoBrId == 0) return (false, "No HO reference account configured at destination branch.");

                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == hoBrId);
                if (drMapping == null)
                    return (false, "No HO reference account configured at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "HO reference account not found at destination branch.");

                return await WriteLoanRecoveryFinalVoucherAsync(ibRecord, destBrId,
                    drMapping.AccId, drAcc.AccountName,
                    (int)Enums.VoucherSubType.IBBrLoanRecStep3,
                    dto, transaction);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB loan recovery.");
            }
        }

        // Shared: Dr=IB-Ref (HO ref at dest), Cr=LoanAccount + interest entries
        private async Task<(bool success, string message)> WriteLoanRecoveryFinalVoucherAsync(
            InterBranchVoucher ibRecord, int branchId,
            int drAccId, string drAccName,
            int voucherSubType,
            IBLoanRecoveryFinalStepDTO dto,
            Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction)
        {
            int loanAccId = ibRecord.DestAccId;
            decimal totalAmount = ibRecord.Amount;

            // Load loan balance at dest branch
            var bal = await _loanRecService.GetLoanBalanceAsync(loanAccId, branchId);
            if (bal == null) return (false, "Loan account not found at destination branch.");
            if (bal.TotalOutstanding <= 0) return (false, "No outstanding balance on the loan account.");
            if (totalAmount > bal.TotalOutstanding + 0.01m)
                return (false, $"Recovery amount ({totalAmount:N2}) exceeds outstanding balance ({bal.TotalOutstanding:N2}).");

            bool isAddInBalance = bal.ActOnIntPosting == 1;

            // Fetch CurrentRecoverableIntAcc for Stand loans
            int currentRecoverableAccId = 0;
            if (!isAddInBalance)
            {
                var productId = await _context.accountmaster.AsNoTracking()
                    .Where(x => x.ID == loanAccId && x.BranchId == branchId)
                    .Select(x => (int?)x.GeneralProductId)
                    .FirstOrDefaultAsync();
                if (productId.HasValue)
                {
                    var bwr = await _context.loanproductbranchwiserule.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.LoanProductId == productId.Value && x.BranchId == branchId);
                    currentRecoverableAccId = bwr?.CurrentRecoverableIntAcc ?? 0;
                }
            }

            // Compute interest and principal split
            decimal principalRec;
            Dictionary<int, decimal> intRec;
            if (isAddInBalance)
            {
                principalRec = Math.Min(totalAmount, bal.PrincipalBalance);
                intRec = new Dictionary<int, decimal>();
            }
            else if (dto.IntAmount.HasValue && dto.IntAmount.Value >= 0)
            {
                (principalRec, intRec) = LoanRecoveryVoucherService.AllocatePublic(totalAmount, bal, dto.IntAmount.Value);
            }
            else
            {
                (principalRec, intRec) = LoanRecoveryVoucherService.AllocatePublic(totalAmount, bal);
            }

            DateTime voucherDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            DateTime valueDate   = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
            string narration = !string.IsNullOrWhiteSpace(dto.Narration)
                ? dto.Narration
                : ibRecord.Narration ?? $"IB Loan Recovery — {ibRecord.DestAccName}";
            string userId = dto.UserId ?? _cf.GetCurrentUserId() ?? "0";

            using var _vrLease = await _cf.ReserveVoucherNoAsync(branchId, voucherDate);
            int nextVrNo = _vrLease.VoucherNo;
            bool isAutoVerification = await _cf.IsAutoVerification(branchId);
            string voucherStatus = isAutoVerification ? "V" : "A";

            var voucher = new Voucher
            {
                BrID             = branchId,
                VoucherNo        = nextVrNo,
                VoucherType      = (int)Enums.VoucherType.InterBranch,
                VoucherSubType   = voucherSubType,
                VoucherDate      = voucherDate,
                ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                VoucherNarration = narration,
                VoucherStatus    = voucherStatus,
                AddedBy          = int.Parse(userId),
                ModifiedBy       = 0,
                VerifiedBy       = isAutoVerification ? int.Parse(userId) : 0,
                OtherBrID        = 0,
            };
            await _context.voucher.AddAsync(voucher);
            await _context.SaveChangesAsync();

            int voucherId = voucher.Id;
            decimal intTotal = intRec.Values.Sum();
            int row = 1;

            // Cr entry — loan account (LR entry)
            long loanHead = await _cf.GetAccountHeadCodeFromAccId(loanAccId, branchId);
            var crEntry = new VoucherCreditDebitDetails
            {
                BrId             = branchId,
                VoucherID        = voucherId,
                AccountId        = loanAccId,
                AccHeadCode      = loanHead,
                VoucherAmount    = principalRec,
                VoucherEntryType = "Cr",
                EntryStatus      = Enums.VoucherStatus.LR.ToString(),
                Narration        = narration,
                VoucherStatus    = voucherStatus,
                ValueDate        = valueDate,
                VoucherSeqNo     = row,
                IntCr            = intTotal > 0 ? intTotal : null,
                IntDr            = null,
                ExpenseAmt       = 0,
                HCL1 = 0, HCL2 = 0, HCL3 = 0,
            };
            await _context.vouchercreditdebitdetails.AddAsync(crEntry);
            await _context.SaveChangesAsync();
            int crId = crEntry.Id;
            row++;

            // Dr entry — IB-Ref account
            long drHeadCode = await _cf.GetAccountHeadCodeFromAccId(drAccId, branchId);
            var drEntry = new VoucherCreditDebitDetails
            {
                BrId             = branchId,
                VoucherID        = voucherId,
                AccountId        = drAccId,
                AccHeadCode      = drHeadCode,
                VoucherAmount    = totalAmount,
                VoucherEntryType = "Dr",
                EntryStatus      = Enums.VoucherStatus.Dr.ToString(),
                Narration        = narration,
                VoucherStatus    = voucherStatus,
                ValueDate        = valueDate,
                VoucherSeqNo     = row,
                IntDr = null, IntCr = null,
                ExpenseAmt = 0,
                HCL1 = 0, HCL2 = 0, HCL3 = 0,
            };
            await _context.vouchercreditdebitdetails.AddAsync(drEntry);
            row++;

            // Cr — interest income account (for Stand loans)
            if (!isAddInBalance && intTotal > 0 && currentRecoverableAccId > 0)
            {
                long intHead = await _cf.GetAccountHeadCodeFromAccId(currentRecoverableAccId, branchId);
                await _context.vouchercreditdebitdetails.AddAsync(new VoucherCreditDebitDetails
                {
                    BrId             = branchId,
                    VoucherID        = voucherId,
                    AccountId        = currentRecoverableAccId,
                    AccHeadCode      = intHead,
                    VoucherAmount    = intTotal,
                    VoucherEntryType = "Cr",
                    EntryStatus      = "IR",
                    Narration        = narration,
                    VoucherStatus    = voucherStatus,
                    ValueDate        = valueDate,
                    VoucherSeqNo     = row,
                    IntDr = null, IntCr = null,
                    ExpenseAmt = 0,
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                });
                row++;
            }

            // voucherrecintdetail entries for interest
            foreach (var (catId, amt) in intRec)
            {
                if (amt <= 0) continue;
                bool isUnposted = catId == 1 || catId == 2;
                await _context.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                {
                    BrId              = branchId,
                    VAccCrDrId        = crId,
                    VoucherId         = voucherId,
                    VoucherNo         = nextVrNo,
                    EntryDate         = voucherDate,
                    ValueDate         = valueDate,
                    IntCatId          = catId,
                    Pamt              = (double)principalRec,
                    AccId             = loanAccId,
                    IntDr             = isUnposted ? (double)amt : 0,
                    IntCr             = (double)amt,
                    VoucherMainStatus = voucherStatus,
                });
            }

            await _context.SaveChangesAsync();

            DateTime.TryParse(dto.WorkingDate, out DateTime parsedWorkingDate);
            bool step2Done = ibRecord.Step2VoucherId.HasValue;

            ibRecord.Step3VoucherId   = voucherId;
            ibRecord.Step3BrId        = branchId;
            ibRecord.Step3DrAccId     = drAccId;
            ibRecord.Step3DrAccName   = drAccName;
            ibRecord.Step3DrHeadCode  = drHeadCode;
            ibRecord.Step3CrAccId     = loanAccId;
            ibRecord.Step3CrAccName   = ibRecord.DestAccName;
            ibRecord.Step3CrHeadCode  = loanHead;
            ibRecord.Step3Date        = voucherDate;
            ibRecord.Step3WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate;
            ibRecord.Step3UserId      = userId;

            // Status: Completed only when both Step 2 and Step 3 done (BranchToBranch)
            if (ibRecord.FlowType == "HOToBranch")
                ibRecord.Status = "Completed";
            else
                ibRecord.Status = step2Done ? "Completed" : "BranchCompleted";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, $"IB loan recovery completed. Voucher No. {nextVrNo}.");
        }

        // ── Queries ───────────────────────────────────────────────────────────────

        public async Task<List<IBVoucherListDTO>> GetIncomingForBranchAsync(int brId)
        {
            var records = await _context.interbranchvoucher.AsNoTracking()
                .Where(x => x.VoucherType == "IBLoanRecovery"
                    && x.DestBrId == brId
                    && x.Step3VoucherId == null
                    && x.Status != "Completed")
                .OrderByDescending(x => x.EntryDate)
                .ToListAsync();

            return await EnrichListAsync(records, brId);
        }

        public async Task<List<IBVoucherListDTO>> GetPendingForHOAsync(int hoBrId)
        {
            var hoMappedBrIds = await _context.otherbranchaccounts.AsNoTracking()
                .Where(x => x.BrId == hoBrId)
                .Select(x => x.OtherBrId)
                .ToListAsync();

            var records = await _context.interbranchvoucher.AsNoTracking()
                .Where(x => x.VoucherType == "IBLoanRecovery"
                    && hoMappedBrIds.Contains(x.FromBrId)
                    && hoMappedBrIds.Contains(x.DestBrId)
                    && x.Step2VoucherId == null
                    && x.Status != "Completed")
                .OrderByDescending(x => x.EntryDate)
                .ToListAsync();

            return await EnrichListAsync(records, hoBrId);
        }

        private async Task<List<IBVoucherListDTO>> EnrichListAsync(List<InterBranchVoucher> records, int contextBrId)
        {
            var branchIds = records.SelectMany(r => new[] { r.FromBrId, r.DestBrId }).Distinct().ToList();
            var branches = await _context.branchmaster.AsNoTracking()
                .Where(b => branchIds.Contains(b.id))
                .ToDictionaryAsync(b => b.id, b => new { b.branchmaster_name, b.branchmaster_code });

            return records.Select(r => new IBVoucherListDTO
            {
                Id           = r.Id,
                VoucherType  = r.VoucherType,
                FlowType     = r.FlowType,
                Amount       = r.Amount,
                Narration    = r.Narration,
                EntryDate    = r.EntryDate,
                Status       = r.Status,
                FromBrId     = r.FromBrId,
                FromBrName   = branches.GetValueOrDefault(r.FromBrId)?.branchmaster_name,
                FromBrCode   = branches.GetValueOrDefault(r.FromBrId)?.branchmaster_code,
                DestBrId     = r.DestBrId,
                DestBrName   = branches.GetValueOrDefault(r.DestBrId)?.branchmaster_name,
                DestBrCode   = branches.GetValueOrDefault(r.DestBrId)?.branchmaster_code,
                DestAccId    = r.DestAccId,
                DestAccNo    = r.DestAccNo,
                DestAccName  = r.DestAccName,
                Step1VoucherId = r.Step1VoucherId,
                Step1DrAccName = r.Step1DrAccName,
                Step1CrAccName = r.Step1CrAccName,
                Step2VoucherId = r.Step2VoucherId,
                Step2DrAccName = r.Step2DrAccName,
                Step2CrAccName = r.Step2CrAccName,
                Step3VoucherId = r.Step3VoucherId,
                Step3DrAccName = r.Step3DrAccName,
                Step3CrAccName = r.Step3CrAccName,
            }).ToList();
        }
    }
}
