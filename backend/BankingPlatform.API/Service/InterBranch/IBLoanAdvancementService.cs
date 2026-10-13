using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterBranch;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Service.Vouchers.Loan;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterBranch
{
    /// <summary>
    /// IB Loan Advancement — mirrors IB Saving Withdrawal flow:
    ///   Cash is disbursed at source/HO; loan account is at dest branch.
    ///   Step 1 (source): Dr=IB-Ref, Cr=Cash
    ///   Step 2 (HO, BranchToBranch): Dr=Dest-Ref, Cr=Source-Ref
    ///   Step 3 (dest): Dr=LoanAccount(LA), Cr=HO-Ref
    /// </summary>
    public class IBLoanAdvancementService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly LoanAdvancementVoucherService _loanAdvService;

        public IBLoanAdvancementService(
            BankingDbContext context,
            CommonFunctions commonfunctions,
            MemberService memberService,
            LoanAdvancementVoucherService loanAdvService)
        {
            _context = context;
            _commonfunctions = commonfunctions;
            _memberService = memberService;
            _loanAdvService = loanAdvService;
        }

        // ── Step 1 — originating branch (HO or non-HO) ──────────────────────────
        // HOToBranch:     Dr=IB-Ref(DestBr), Cr=Cash at HO           → IBHOLoanAdvStep1
        // BranchToBranch: Dr=IB-Ref(HO),     Cr=Cash at source branch → IBBrLoanAdvStep1
        public async Task<(bool success, string message, int ibVoucherId)> CreateStep1Async(IBLoanAdvancementStep1DTO dto)
        {
            if (dto.Amount <= 0)
                return (false, "Amount must be greater than zero.", 0);
            if (dto.DestBrId == dto.BrId)
                return (false, "Destination branch cannot be the same as originating branch.", 0);

            // Max disbursements check at step 1 (dest branch context)
            var disbCheck = await _loanAdvService.CheckMaxDisbursementsAsync(dto.DestAccId, dto.DestBrId);
            if (!disbCheck.canDisburse)
                return (false, disbCheck.message, 0);

            string flowType = dto.FlowType == "HOToBranch" ? "HOToBranch" : "BranchToBranch";
            int subType = flowType == "HOToBranch"
                ? (int)Enums.VoucherSubType.IBHOLoanAdvStep1
                : (int)Enums.VoucherSubType.IBBrLoanAdvStep1;

            // DrAccId = IB-Ref account (must be in otherbranchaccounts at originating branch)
            var refAcc = await _context.otherbranchaccounts
                .FirstOrDefaultAsync(x => x.BrId == dto.BrId && x.AccId == dto.DrAccId);
            if (refAcc == null)
                return (false, "Debit account is not a configured IB reference account for this branch.", 0);

            var destAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.DestAccId && x.BranchId == dto.DestBrId);
            if (destAcc == null)
                return (false, "Loan account not found at the specified destination branch.", 0);
            if (destAcc.AccTypeId != (int)Enums.AccountTypes.Loan)
                return (false, "Destination account must be a Loan account.", 0);

            var drAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.DrAccId && x.BranchId == dto.BrId);
            if (drAcc == null)
                return (false, "IB reference (debit) account not found at originating branch.", 0);

            var crAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.CrAccId && x.BranchId == dto.BrId);
            if (crAcc == null)
                return (false, "Cash (credit) account not found at originating branch.", 0);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int branchId = dto.BrId;
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate   = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narration = dto.Narration ?? $"IB Loan Advancement for A/c {dto.DestAccNo} ({dto.DestAccName})";
                string userId    = dto.UserId ?? _commonfunctions.GetCurrentUserId() ?? "0";

                using var _vrLease = await _commonfunctions.ReserveVoucherNoAsync(branchId, voucherDate);
                int nextVrNo = _vrLease.VoucherNo;
                bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
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
                    VoucherSubType   = subType,
                    TotalDebit       = dto.Amount,
                    DebitAccountId   = dto.DrAccId,
                    CreditAccountId  = dto.CrAccId,
                };

                var voucherEntity = _memberService.MapToEntity(voucherDTO);
                await _context.voucher.AddAsync(voucherEntity);
                await _context.SaveChangesAsync();

                long drHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.DrAccId, branchId);
                long crHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.CrAccId, branchId);

                int row = 1;
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(
                        drHeadCode, dto.DrAccId, branchId,
                        Enums.VoucherStatus.Dr.ToString(), narration,
                        dto.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
                row++;
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(
                        crHeadCode, dto.CrAccId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), narration,
                        dto.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
                await _context.SaveChangesAsync();

                DateTime.TryParse(dto.WorkingDate, out DateTime parsedWorkingDate);

                var ibRecord = new InterBranchVoucher
                {
                    VoucherType  = "IBLoanAdvancement",
                    FlowType     = flowType,
                    Amount       = dto.Amount,
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
                    Step1DrAccId     = dto.DrAccId,
                    Step1DrAccName   = drAcc.AccountName,
                    Step1DrHeadCode  = drHeadCode,
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
                return (true, "IB loan advancement voucher recorded successfully.", ibRecord.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while saving the IB loan advancement voucher.", 0);
            }
        }

        // ── Step 2 — HO settles (BranchToBranch only) ────────────────────────────
        // Dr=Dest-Ref, Cr=Source-Ref (same reversal as IB withdrawal HO step)
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

                // Loan advancement: Dr=Dest-Ref, Cr=Source-Ref (mirrors IB withdrawal)
                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == dto.HoBrId && x.OtherBrId == ibRecord.DestBrId);
                if (drMapping == null)
                    return (false, $"No reference account configured at HO for destination branch (ID {ibRecord.DestBrId}).");

                var crMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == dto.HoBrId && x.OtherBrId == ibRecord.FromBrId);
                if (crMapping == null)
                    return (false, $"No reference account configured at HO for originating branch (ID {ibRecord.FromBrId}).");

                var drAcc = await _context.accountmaster.FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == dto.HoBrId);
                var crAcc = await _context.accountmaster.FirstOrDefaultAsync(x => x.ID == crMapping.AccId && x.BranchId == dto.HoBrId);
                if (drAcc == null || crAcc == null)
                    return (false, "One or more reference accounts not found at HO.");

                int branchId = dto.HoBrId;
                DateTime voucherDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                DateTime valueDate   = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
                string narration = !string.IsNullOrWhiteSpace(dto.Narration)
                    ? dto.Narration
                    : ibRecord.Narration ?? $"IB Loan Adv Settlement — Br{ibRecord.FromBrId} → Br{ibRecord.DestBrId}";
                string userId = dto.UserId ?? _commonfunctions.GetCurrentUserId() ?? "0";

                using var _vrLease = await _commonfunctions.ReserveVoucherNoAsync(branchId, voucherDate);
                int nextVrNo = _vrLease.VoucherNo;
                bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
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
                    VoucherSubType   = (int)Enums.VoucherSubType.IBBrLoanAdvStep2,
                    TotalDebit       = ibRecord.Amount,
                    DebitAccountId   = drMapping.AccId,
                    CreditAccountId  = crMapping.AccId,
                };

                var voucherEntity = _memberService.MapToEntity(voucherDTO);
                await _context.voucher.AddAsync(voucherEntity);
                await _context.SaveChangesAsync();

                long drHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(drMapping.AccId, branchId);
                long crHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(crMapping.AccId, branchId);

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

                ibRecord.Status          = ibRecord.Step3VoucherId.HasValue ? "Completed" : "HOConfirmed";
                ibRecord.Step2VoucherId  = voucherEntity.Id;
                ibRecord.Step2BrId       = branchId;
                ibRecord.Step2DrAccId    = drMapping.AccId;
                ibRecord.Step2DrAccName  = drAcc.AccountName;
                ibRecord.Step2DrHeadCode = drHeadCode;
                ibRecord.Step2CrAccId    = crMapping.AccId;
                ibRecord.Step2CrAccName  = crAcc.AccountName;
                ibRecord.Step2CrHeadCode = crHeadCode;
                ibRecord.Step2Date       = voucherDate;
                ibRecord.Step2WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate;
                ibRecord.Step2UserId     = userId;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "HO settlement confirmed successfully.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred during HO loan advancement settlement.");
            }
        }

        // ── Step 3 final — dest branch books the loan ─────────────────────────────
        // HOToBranch: Step 2 at dest
        // BranchToBranch: Step 3 at dest
        // Dr=LoanAccount(EntryStatus=LA), Cr=HO-Ref
        public async Task<(bool success, string message)> DispatchFinalStepAsync(int ibVoucherId, IBSavingDepositStep3DTO dto)
        {
            var ibRecord = await _context.interbranchvoucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == ibVoucherId);
            if (ibRecord == null) return (false, "Inter-branch voucher not found.");

            // Max disbursements check (at dest branch where loan lives)
            var disbCheck = await _loanAdvService.CheckMaxDisbursementsAsync(ibRecord.DestAccId, dto.DestBrId);
            if (!disbCheck.canDisburse)
                return (false, disbCheck.message);

            return ibRecord.FlowType == "HOToBranch"
                ? await CreateHOFinalStepAsync(ibVoucherId, dto)
                : await CreateBranchFinalStepAsync(ibVoucherId, dto);
        }

        private async Task<(bool success, string message)> CreateHOFinalStepAsync(int ibVoucherId, IBSavingDepositStep3DTO dto)
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

                // Cr: dest branch's HO-ref account (FromBrId = HO for HOToBranch)
                var crMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == ibRecord.FromBrId);
                if (crMapping == null)
                    return (false, "No HO reference account configured at destination branch.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == crMapping.AccId && x.BranchId == destBrId);
                if (crAcc == null) return (false, "HO reference account not found at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == ibRecord.DestAccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "Loan account not found at destination branch.");

                return await WriteLoanFinalVoucherAsync(ibRecord, destBrId,
                    ibRecord.DestAccId, drAcc.AccountName,
                    crMapping.AccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBHOLoanAdvStep2,
                    dto.WorkingDate, dto.UserId, transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB loan advancement.");
            }
        }

        private async Task<(bool success, string message)> CreateBranchFinalStepAsync(int ibVoucherId, IBSavingDepositStep3DTO dto)
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

                int hoBrId = ibRecord.Step2BrId
                    ?? (await _context.otherbranchaccounts
                           .Where(x => x.BrId == destBrId)
                           .Select(x => (int?)x.OtherBrId)
                           .FirstOrDefaultAsync()) ?? 0;
                if (hoBrId == 0) return (false, "No HO reference account configured at destination branch.");

                var crMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == hoBrId);
                if (crMapping == null)
                    return (false, "No HO reference account configured at destination branch.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == crMapping.AccId && x.BranchId == destBrId);
                if (crAcc == null) return (false, "HO reference account not found at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == ibRecord.DestAccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "Loan account not found at destination branch.");

                return await WriteLoanFinalVoucherAsync(ibRecord, destBrId,
                    ibRecord.DestAccId, drAcc.AccountName,
                    crMapping.AccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBBrLoanAdvStep3,
                    dto.WorkingDate, dto.UserId, transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB loan advancement.");
            }
        }

        // Shared: Dr=LoanAccount(LA entry), Cr=HO-Ref
        private async Task<(bool success, string message)> WriteLoanFinalVoucherAsync(
            InterBranchVoucher ibRecord, int branchId,
            int drAccId, string drAccName,
            int crAccId, string crAccName,
            int voucherSubType, string workingDateStr, string? userIdRaw,
            Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction,
            string? narrationOverride = null)
        {
            DateTime voucherDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            DateTime valueDate   = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
            string narration = !string.IsNullOrWhiteSpace(narrationOverride)
                ? narrationOverride
                : ibRecord.Narration ?? $"IB Loan Advancement — credit to {ibRecord.DestAccName}";
            string userId = userIdRaw ?? _commonfunctions.GetCurrentUserId() ?? "0";

            using var _vrLease = await _commonfunctions.ReserveVoucherNoAsync(branchId, voucherDate);
            int nextVrNo = _vrLease.VoucherNo;
            bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
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
                VoucherSubType   = voucherSubType,
                TotalDebit       = ibRecord.Amount,
                DebitAccountId   = drAccId,
                CreditAccountId  = crAccId,
            };

            var voucherEntity = _memberService.MapToEntity(voucherDTO);
            await _context.voucher.AddAsync(voucherEntity);
            await _context.SaveChangesAsync();

            long drHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(drAccId, branchId);
            long crHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(crAccId, branchId);

            int row = 1;
            // Loan account Dr entry — EntryStatus = "LA" so balance calculations pick it up
            await _context.vouchercreditdebitdetails.AddAsync(
                _memberService.voucherCreditDebitDetails(
                    drHeadCode, drAccId, branchId,
                    Enums.VoucherStatus.LA.ToString(), narration,
                    ibRecord.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
            row++;
            // HO-Ref Cr entry
            await _context.vouchercreditdebitdetails.AddAsync(
                _memberService.voucherCreditDebitDetails(
                    crHeadCode, crAccId, branchId,
                    Enums.VoucherStatus.Cr.ToString(), narration,
                    ibRecord.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
            await _context.SaveChangesAsync();

            ibRecord.Status = (ibRecord.FlowType == "BranchToBranch" && !ibRecord.Step2VoucherId.HasValue)
                ? "BranchCompleted"
                : "Completed";
            ibRecord.Step3VoucherId   = voucherEntity.Id;
            ibRecord.Step3BrId        = branchId;
            ibRecord.Step3DrAccId     = drAccId;
            ibRecord.Step3DrAccName   = drAccName;
            ibRecord.Step3DrHeadCode  = drHeadCode;
            ibRecord.Step3CrAccId     = crAccId;
            ibRecord.Step3CrAccName   = crAccName;
            ibRecord.Step3CrHeadCode  = crHeadCode;
            ibRecord.Step3Date        = voucherDate;

            DateTime.TryParse(workingDateStr, out DateTime parsedWorkingDate);
            ibRecord.Step3WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate;
            ibRecord.Step3UserId      = userId;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, "IB loan advancement completed. Loan account advanced successfully.");
        }

        // ── Queries — delegate to IBSavingDepositService which uses the same DTO ──

        public async Task<List<IBVoucherListDTO>> GetPendingForHOAsync(int hoBrId)
        {
            // Loan advancement HO step: Dr=Dest-Ref, Cr=Source-Ref
            var list = await _context.interbranchvoucher
                .Where(x => x.VoucherType == "IBLoanAdvancement"
                         && x.FlowType == "BranchToBranch"
                         && x.Step2VoucherId == null
                         && x.Status != "Completed")
                .Join(_context.branchmaster, v => v.FromBrId, b => b.id,
                      (v, b) => new { v, FromBrName = b.branchmaster_name, FromBrCode = b.branchmaster_code })
                .Join(_context.branchmaster, x => x.v.DestBrId, b => b.id, (x, b) => new IBVoucherListDTO
                {
                    Id             = x.v.Id,
                    VoucherType    = x.v.VoucherType,
                    FlowType       = x.v.FlowType,
                    Amount         = x.v.Amount,
                    Narration      = x.v.Narration,
                    EntryDate      = x.v.EntryDate,
                    Status         = x.v.Status,
                    FromBrId       = x.v.FromBrId,
                    FromBrName     = x.FromBrName,
                    FromBrCode     = x.FromBrCode,
                    DestBrId       = x.v.DestBrId,
                    DestBrName     = b.branchmaster_name,
                    DestBrCode     = b.branchmaster_code,
                    DestAccNo      = x.v.DestAccNo,
                    DestAccName    = x.v.DestAccName,
                    Step1DrAccName = x.v.Step1DrAccName,
                    Step1CrAccName = x.v.Step1CrAccName,
                    Step2VoucherId = x.v.Step2VoucherId,
                    Step2DrAccName = x.v.Step2DrAccName,
                    Step2CrAccName = x.v.Step2CrAccName,
                    Step3VoucherId = x.v.Step3VoucherId,
                    Step3DrAccName = x.v.Step3DrAccName,
                    Step3CrAccName = x.v.Step3CrAccName,
                })
                .ToListAsync();

            // Pre-resolve Step 2 account names (Dr=Dest-Ref, Cr=Source-Ref for loan adv)
            var brIds = list.SelectMany(d => new[] { d.FromBrId, d.DestBrId }).Distinct().ToList();
            if (brIds.Count > 0)
            {
                var mappings = await _context.otherbranchaccounts
                    .Where(x => x.BrId == hoBrId && brIds.Contains(x.OtherBrId))
                    .ToListAsync();

                var accIds = mappings.Select(m => m.AccId).Distinct().ToList();
                var accNames = await _context.accountmaster
                    .Where(a => accIds.Contains(a.ID) && a.BranchId == hoBrId)
                    .Select(a => new { a.ID, a.AccountName })
                    .ToDictionaryAsync(a => a.ID, a => a.AccountName);

                foreach (var dto in list)
                {
                    if (dto.Step2DrAccName != null) continue;
                    // Loan advancement: Dr=Dest-Ref, Cr=Source-Ref
                    var drMap = mappings.FirstOrDefault(m => m.OtherBrId == dto.DestBrId);
                    var crMap = mappings.FirstOrDefault(m => m.OtherBrId == dto.FromBrId);
                    if (drMap != null && accNames.TryGetValue(drMap.AccId, out var drName))
                        dto.Step2DrAccName = drName;
                    if (crMap != null && accNames.TryGetValue(crMap.AccId, out var crName))
                        dto.Step2CrAccName = crName;
                }
            }

            return list;
        }

        public async Task<List<IBVoucherListDTO>> GetIncomingForBranchAsync(int brId)
        {
            var raw = await _context.interbranchvoucher
                .Where(x => x.VoucherType == "IBLoanAdvancement"
                         && x.DestBrId == brId
                         && x.Step3VoucherId == null
                         && x.Status != "Completed")
                .Join(_context.branchmaster, v => v.FromBrId, b => b.id,
                      (v, b) => new { v, FromBrName = b.branchmaster_name, FromBrCode = b.branchmaster_code })
                .Join(_context.branchmaster, x => x.v.DestBrId, b => b.id, (x, b) => new
                {
                    Dto = new IBVoucherListDTO
                    {
                        Id             = x.v.Id,
                        VoucherType    = x.v.VoucherType,
                        FlowType       = x.v.FlowType,
                        Amount         = x.v.Amount,
                        Narration      = x.v.Narration,
                        EntryDate      = x.v.EntryDate,
                        Status         = x.v.Status,
                        FromBrId       = x.v.FromBrId,
                        FromBrName     = x.FromBrName,
                        FromBrCode     = x.FromBrCode,
                        DestBrId       = x.v.DestBrId,
                        DestBrName     = b.branchmaster_name,
                        DestBrCode     = b.branchmaster_code,
                        DestAccNo      = x.v.DestAccNo,
                        DestAccName    = x.v.DestAccName,
                        Step1DrAccName = x.v.Step1DrAccName,
                        Step1CrAccName = x.v.Step1CrAccName,
                        Step2VoucherId = x.v.Step2VoucherId,
                        Step2DrAccName = x.v.Step2DrAccName,
                        Step2CrAccName = x.v.Step2CrAccName,
                        Step3VoucherId = x.v.Step3VoucherId,
                        Step3DrAccName = x.v.Step3DrAccName,
                        Step3CrAccName = x.v.Step3CrAccName,
                    },
                    Step2BrId = x.v.Step2BrId,
                })
                .ToListAsync();

            int? fallbackHoBrId = null;
            if (raw.Any(r => r.Dto.FlowType == "BranchToBranch" && r.Step2BrId == null))
            {
                fallbackHoBrId = await _context.otherbranchaccounts
                    .Where(x => x.BrId == brId)
                    .Select(x => (int?)x.OtherBrId)
                    .FirstOrDefaultAsync();
            }

            var hoBrIds = raw
                .Select(r => r.Dto.FlowType == "HOToBranch"
                    ? r.Dto.FromBrId
                    : (r.Step2BrId ?? fallbackHoBrId ?? 0))
                .Where(id => id != 0)
                .Distinct()
                .ToList();

            if (hoBrIds.Count > 0)
            {
                var mappings = await _context.otherbranchaccounts
                    .Where(x => x.BrId == brId && hoBrIds.Contains(x.OtherBrId))
                    .ToListAsync();

                var accIds = mappings.Select(m => m.AccId).Distinct().ToList();
                var accNames = await _context.accountmaster
                    .Where(a => accIds.Contains(a.ID) && a.BranchId == brId)
                    .Select(a => new { a.ID, a.AccountName })
                    .ToDictionaryAsync(a => a.ID, a => a.AccountName);

                foreach (var r in raw)
                {
                    if (r.Dto.Step3DrAccName != null) continue;
                    int hoBrId = r.Dto.FlowType == "HOToBranch"
                        ? r.Dto.FromBrId
                        : (r.Step2BrId ?? fallbackHoBrId ?? 0);
                    if (hoBrId == 0) continue;
                    var mapping = mappings.FirstOrDefault(m => m.OtherBrId == hoBrId);
                    if (mapping != null && accNames.TryGetValue(mapping.AccId, out var name))
                        r.Dto.Step3DrAccName = name;
                }
            }

            return raw.Select(r => r.Dto).ToList();
        }
    }
}
