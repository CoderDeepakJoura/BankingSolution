using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterBranch;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterBranch
{
    public class IBSavingDepositService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;

        public IBSavingDepositService(BankingDbContext context, CommonFunctions commonfunctions, MemberService memberService)
        {
            _context = context;
            _commonfunctions = commonfunctions;
            _memberService = memberService;
        }

        // ── Step 1 — originating branch (HO or non-HO) ──────────────────────────
        // HOToBranch:     Dr Cash at HO,           Cr Dest-Branch-Ref at HO         → IBHOSavDepStep1
        // BranchToBranch: Dr Cash at Source Branch, Cr HO-Ref at Source Branch      → IBBrSavDepStep1
        public async Task<(bool success, string message, int ibVoucherId)> CreateStep1Async(IBSavingDepositStep1DTO dto)
        {
            if (dto.Amount <= 0)
                return (false, "Amount must be greater than zero.", 0);
            if (dto.DestBrId == dto.BrId)
                return (false, "Destination branch cannot be the same as originating branch.", 0);

            string flowType = dto.FlowType == "HOToBranch" ? "HOToBranch" : "BranchToBranch";
            int subType = flowType == "HOToBranch"
                ? (int)Enums.VoucherSubType.IBHOSavDepStep1
                : (int)Enums.VoucherSubType.IBBrSavDepStep1;

            var refAcc = await _context.otherbranchaccounts
                .FirstOrDefaultAsync(x => x.BrId == dto.BrId && x.AccId == dto.CrAccId);
            if (refAcc == null)
                return (false, "Credit account is not a configured reference account for this branch.", 0);

            var destAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.DestAccId && x.BranchId == dto.DestBrId);
            if (destAcc == null)
                return (false, "Destination account not found at the specified destination branch.", 0);
            if (destAcc.AccTypeId != (int)Enums.AccountTypes.Saving)
                return (false, "Destination account must be a Saving account.", 0);

            var drAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.DrAccId && x.BranchId == dto.BrId);
            if (drAcc == null)
                return (false, "Cash (debit) account not found at originating branch.", 0);

            var crAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.CrAccId && x.BranchId == dto.BrId);
            if (crAcc == null)
                return (false, "Credit reference account not found at originating branch.", 0);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int branchId = dto.BrId;
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate   = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narration = dto.Narration ?? $"IB Saving Deposit to A/c {dto.DestAccNo} ({dto.DestAccName})";
                string userId    = dto.UserId ?? _commonfunctions.GetCurrentUserId() ?? "0";

                int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, voucherDate);
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
                    VoucherType  = "IBSavingDeposit",
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

                return (true, "Success", ibRecord.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while saving the inter-branch voucher.", 0);
            }
        }

        // ── Step 2 — HO settles (BranchToBranch only) ────────────────────────────
        // Dr: HO's ref account for originating branch
        // Cr: HO's ref account for destination branch
        // Subtype: IBBrSavDepStep2
        public async Task<(bool success, string message)> CreateBranchToHOSettlementAsync(int ibVoucherId, IBSavingDepositStep2DTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ibRecord = await _context.interbranchvoucher
                    .FromSqlInterpolated($"SELECT * FROM interbranchvoucher WHERE id = {ibVoucherId} FOR UPDATE")
                    .FirstOrDefaultAsync();
                if (ibRecord == null)
                    return (false, "Inter-branch voucher not found.");
                if (ibRecord.Step2VoucherId.HasValue)
                    return (false, "HO has already settled this voucher.");

                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == dto.HoBrId && x.OtherBrId == ibRecord.FromBrId);
                if (drMapping == null)
                    return (false, $"No reference account configured at HO for originating branch (ID {ibRecord.FromBrId}).");

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
                    : ibRecord.Narration ?? $"IB Settlement — Br{ibRecord.FromBrId} → Br{ibRecord.DestBrId}";
                string userId    = dto.UserId ?? _commonfunctions.GetCurrentUserId() ?? "0";

                int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, voucherDate);
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
                    VoucherSubType   = (int)Enums.VoucherSubType.IBBrSavDepStep2,
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

                // If dest branch already completed their step, both sides are now done
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
                return (false, ex.Message ?? "An error occurred during HO settlement.");
            }
        }

        // ── Step 3 (dest branch) — BranchToBranch ────────────────────────────────
        // Dr: dest branch's HO-ref account
        // Cr: customer saving account (actual balance credit)
        // Subtype: IBBrSavDepStep3
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

                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == hoBrId);
                if (drMapping == null)
                    return (false, "No HO reference account configured at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "HO reference account not found at destination branch.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == ibRecord.DestAccId && x.BranchId == destBrId);
                if (crAcc == null) return (false, "Destination saving account not found.");

                return await WriteFinalVoucherAsync(ibRecord, destBrId, drMapping.AccId, drAcc.AccountName,
                    ibRecord.DestAccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBBrSavDepStep3, dto.WorkingDate, dto.UserId,
                    transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the inter-branch voucher.");
            }
        }

        // ── Step 2 (dest branch) — HOToBranch ────────────────────────────────────
        // Dr: dest branch's HO-ref account
        // Cr: customer saving account (actual balance credit)
        // Subtype: IBHOSavDepStep2
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

                // Dr: dest branch's ref account pointing back to HO (FromBrId = HO)
                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == ibRecord.FromBrId);
                if (drMapping == null)
                    return (false, "No HO reference account configured at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "HO reference account not found at destination branch.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == ibRecord.DestAccId && x.BranchId == destBrId);
                if (crAcc == null) return (false, "Destination saving account not found.");

                return await WriteFinalVoucherAsync(ibRecord, destBrId, drMapping.AccId, drAcc.AccountName,
                    ibRecord.DestAccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBHOSavDepStep2, dto.WorkingDate, dto.UserId,
                    transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the inter-branch voucher.");
            }
        }

        // Shared logic: write the actual customer credit voucher and vouchersavingdetail
        private async Task<(bool success, string message)> WriteFinalVoucherAsync(
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
                : ibRecord.Narration ?? $"IB Saving Deposit — credit to {ibRecord.DestAccName}";
            string userId    = userIdRaw ?? _commonfunctions.GetCurrentUserId() ?? "0";

            int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, voucherDate);
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
            await _context.vouchercreditdebitdetails.AddAsync(
                _memberService.voucherCreditDebitDetails(
                    drHeadCode, drAccId, branchId,
                    Enums.VoucherStatus.Dr.ToString(), narration,
                    ibRecord.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
            row++;
            var crDetail = _memberService.voucherCreditDebitDetails(
                crHeadCode, crAccId, branchId,
                Enums.VoucherStatus.Cr.ToString(), narration,
                ibRecord.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row);
            await _context.vouchercreditdebitdetails.AddAsync(crDetail);
            await _context.SaveChangesAsync();

            // Credit the customer's saving account balance — same as a normal saving deposit
            var voucherMapper = new BankingPlatform.API.Mappers.Voucher.VoucherMapper();
            DateTime.TryParse(workingDateStr, out DateTime parsedWorkingDate);
            var savingDetail = voucherMapper.voucherSavingDetails(
                branchId, crAccId, 0,
                crDetail.Id, voucherEntity.Id,
                narration, ibRecord.Amount, voucherStatus,
                parsedWorkingDate == default ? voucherDate : parsedWorkingDate,
                valueDate, "SD", 0);
            await _context.vouchersavingdetail.AddAsync(savingDetail);
            await _context.SaveChangesAsync();

            // For BranchToBranch: only mark Completed when both Step 2 (HO) and Step 3 (dest) are done.
            // If HO hasn't settled yet, use "BranchCompleted" so HO can still see and act on it.
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
            ibRecord.Step3WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate;
            ibRecord.Step3UserId      = userId;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, "Inter-branch voucher completed. Saving account credited successfully.");
        }

        // ── IB Saving Withdrawal — Step 1 ─────────────────────────────────────────
        // HOToBranch:     Dr Dest-Branch-Ref at HO, Cr Cash at HO         → IBHOSavWdlStep1
        // BranchToBranch: Dr HO-Ref at Source Branch, Cr Cash at Source   → IBBrSavWdlStep1
        public async Task<(bool success, string message, int ibVoucherId)> CreateWithdrawalStep1Async(IBSavingDepositStep1DTO dto)
        {
            if (dto.Amount <= 0)
                return (false, "Amount must be greater than zero.", 0);
            if (dto.DestBrId == dto.BrId)
                return (false, "Destination branch cannot be the same as originating branch.", 0);

            string flowType = dto.FlowType == "HOToBranch" ? "HOToBranch" : "BranchToBranch";
            int subType = flowType == "HOToBranch"
                ? (int)Enums.VoucherSubType.IBHOSavWdlStep1
                : (int)Enums.VoucherSubType.IBBrSavWdlStep1;

            // For withdrawal: DrAccId = IB-Ref (must be in otherbranchaccounts), CrAccId = Cash
            var refAcc = await _context.otherbranchaccounts
                .FirstOrDefaultAsync(x => x.BrId == dto.BrId && x.AccId == dto.DrAccId);
            if (refAcc == null)
                return (false, "Debit account is not a configured reference account for this branch.", 0);

            var destAcc = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == dto.DestAccId && x.BranchId == dto.DestBrId);
            if (destAcc == null)
                return (false, "Destination account not found at the specified destination branch.", 0);
            if (destAcc.AccTypeId != (int)Enums.AccountTypes.Saving)
                return (false, "Destination account must be a Saving account.", 0);

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
                string narration = dto.Narration ?? $"IB Saving Withdrawal from A/c {dto.DestAccNo} ({dto.DestAccName})";
                string userId    = dto.UserId ?? _commonfunctions.GetCurrentUserId() ?? "0";

                int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, voucherDate);
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
                    VoucherType  = "IBSavingWithdrawal",
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

                return (true, "Success", ibRecord.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while saving the inter-branch withdrawal voucher.", 0);
            }
        }

        // ── IB Saving Withdrawal — Step 2 (HO settlement, BranchToBranch only) ──
        // Dr: HO's ref account for DEST branch (reversed from deposit: deposit Dr = Source-Ref)
        // Cr: HO's ref account for SOURCE branch (reversed from deposit: deposit Cr = Dest-Ref)
        // Subtype: IBBrSavWdlStep2
        private async Task<(bool success, string message)> CreateWithdrawalHOSettlementAsync(int ibVoucherId, IBSavingDepositStep2DTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ibRecord = await _context.interbranchvoucher
                    .FromSqlInterpolated($"SELECT * FROM interbranchvoucher WHERE id = {ibVoucherId} FOR UPDATE")
                    .FirstOrDefaultAsync();
                if (ibRecord == null)
                    return (false, "Inter-branch voucher not found.");
                if (ibRecord.Step2VoucherId.HasValue)
                    return (false, "HO has already settled this voucher.");

                // Withdrawal: Dr = Dest-Ref, Cr = Source-Ref (reversed vs deposit)
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
                    : ibRecord.Narration ?? $"IB Withdrawal Settlement — Br{ibRecord.FromBrId} ← Br{ibRecord.DestBrId}";
                string userId    = dto.UserId ?? _commonfunctions.GetCurrentUserId() ?? "0";

                int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, voucherDate);
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
                    VoucherSubType   = (int)Enums.VoucherSubType.IBBrSavWdlStep2,
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
                return (false, ex.Message ?? "An error occurred during HO withdrawal settlement.");
            }
        }

        // ── IB Saving Withdrawal — Step 3 (dest branch, BranchToBranch) ──────────
        // Dr: customer saving account (debited), Cr: dest branch's HO-ref account
        // Subtype: IBBrSavWdlStep3
        private async Task<(bool success, string message)> CreateWithdrawalBranchFinalStepAsync(int ibVoucherId, IBSavingDepositStep3DTO dto)
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
                if (drAcc == null) return (false, "Destination saving account not found.");

                // For withdrawal: Dr = Customer, Cr = HO-Ref (opposite of deposit final step)
                return await WriteWithdrawalFinalVoucherAsync(ibRecord, destBrId,
                    ibRecord.DestAccId, drAcc.AccountName,
                    crMapping.AccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBBrSavWdlStep3, dto.WorkingDate, dto.UserId,
                    transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the inter-branch withdrawal.");
            }
        }

        // ── IB Saving Withdrawal — Step 2 at dest branch (HOToBranch) ────────────
        // Dr: customer saving account (debited), Cr: dest branch's HO-ref (= FromBrId = HO)
        // Subtype: IBHOSavWdlStep2
        private async Task<(bool success, string message)> CreateWithdrawalHOFinalStepAsync(int ibVoucherId, IBSavingDepositStep3DTO dto)
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

                // Cr: dest branch's ref account pointing back to HO (FromBrId = HO)
                var crMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == ibRecord.FromBrId);
                if (crMapping == null)
                    return (false, "No HO reference account configured at destination branch.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == crMapping.AccId && x.BranchId == destBrId);
                if (crAcc == null) return (false, "HO reference account not found at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == ibRecord.DestAccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "Destination saving account not found.");

                // For withdrawal: Dr = Customer, Cr = HO-Ref (opposite of deposit)
                return await WriteWithdrawalFinalVoucherAsync(ibRecord, destBrId,
                    ibRecord.DestAccId, drAcc.AccountName,
                    crMapping.AccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBHOSavWdlStep2, dto.WorkingDate, dto.UserId,
                    transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the inter-branch withdrawal.");
            }
        }

        // Shared logic for withdrawal final step: debit customer account, credit HO-Ref
        private async Task<(bool success, string message)> WriteWithdrawalFinalVoucherAsync(
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
                : ibRecord.Narration ?? $"IB Saving Withdrawal — debit from {ibRecord.DestAccName}";
            string userId    = userIdRaw ?? _commonfunctions.GetCurrentUserId() ?? "0";

            int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, voucherDate);
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
            var drDetail = _memberService.voucherCreditDebitDetails(
                drHeadCode, drAccId, branchId,
                Enums.VoucherStatus.Dr.ToString(), narration,
                ibRecord.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row);
            await _context.vouchercreditdebitdetails.AddAsync(drDetail);
            row++;
            await _context.vouchercreditdebitdetails.AddAsync(
                _memberService.voucherCreditDebitDetails(
                    crHeadCode, crAccId, branchId,
                    Enums.VoucherStatus.Cr.ToString(), narration,
                    ibRecord.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
            await _context.SaveChangesAsync();

            // Debit the customer's saving account — withdrawal operation "SW" on the Dr (customer) account
            var voucherMapper = new BankingPlatform.API.Mappers.Voucher.VoucherMapper();
            DateTime.TryParse(workingDateStr, out DateTime parsedWorkingDate);
            var savingDetail = voucherMapper.voucherSavingDetails(
                branchId, drAccId, 0,
                drDetail.Id, voucherEntity.Id,
                narration, ibRecord.Amount, voucherStatus,
                parsedWorkingDate == default ? voucherDate : parsedWorkingDate,
                valueDate, "SW", 0);
            await _context.vouchersavingdetail.AddAsync(savingDetail);
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
            ibRecord.Step3WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate;
            ibRecord.Step3UserId      = userId;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, "Inter-branch withdrawal completed. Saving account debited successfully.");
        }

        // ── Dispatch wrappers ──────────────────────────────────────────────────────

        public async Task<(bool success, string message)> DispatchStep2Async(int ibVoucherId, IBSavingDepositStep2DTO dto)
        {
            var ibRecord = await _context.interbranchvoucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == ibVoucherId);
            if (ibRecord == null) return (false, "Inter-branch voucher not found.");
            if (ibRecord.FlowType != "BranchToBranch")
                return (false, "Step 2 (HO settlement) only applies to Branch-to-Branch vouchers.");

            return ibRecord.VoucherType switch
            {
                "IBSavingDeposit"    => await CreateBranchToHOSettlementAsync(ibVoucherId, dto),
                "IBSavingWithdrawal" => await CreateWithdrawalHOSettlementAsync(ibVoucherId, dto),
                _ => (false, $"No Step 2 handler for voucher type '{ibRecord.VoucherType}'."),
            };
        }

        // Dest branch final action — routes by flowtype
        public async Task<(bool success, string message)> DispatchStep3Async(int ibVoucherId, IBSavingDepositStep3DTO dto)
        {
            var ibRecord = await _context.interbranchvoucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == ibVoucherId);
            if (ibRecord == null) return (false, "Inter-branch voucher not found.");

            return ibRecord.VoucherType switch
            {
                "IBSavingDeposit" => ibRecord.FlowType == "HOToBranch"
                    ? await CreateHOFinalStepAsync(ibVoucherId, dto)
                    : await CreateBranchFinalStepAsync(ibVoucherId, dto),
                "IBSavingWithdrawal" => ibRecord.FlowType == "HOToBranch"
                    ? await CreateWithdrawalHOFinalStepAsync(ibVoucherId, dto)
                    : await CreateWithdrawalBranchFinalStepAsync(ibVoucherId, dto),
                _ => (false, $"No completion handler for voucher type '{ibRecord.VoucherType}'."),
            };
        }

        // ── Notifications ─────────────────────────────────────────────────────────

        public async Task<IBNotificationDTO> GetNotificationsAsync(int brId)
        {
            // Incoming: vouchers where this branch is the dest and step3 not done
            var incoming = await _context.interbranchvoucher
                .Where(x => x.DestBrId == brId && x.Step3VoucherId == null && x.Status != "Completed")
                .Join(_context.branchmaster, v => v.FromBrId, b => b.id,
                      (v, b) => new IBNotificationItemDTO
                      {
                          Id          = v.Id,
                          Type        = "incoming",
                          VoucherType = v.VoucherType,
                          Amount      = v.Amount,
                          FromBrName  = b.branchmaster_name,
                          DestAccName = v.DestAccName,
                      })
                .ToListAsync();

            // Pending HO: only show to branches that have reference accounts configured for
            // both sides of a BranchToBranch voucher — i.e., the actual HO intermediary
            var hoMappedBrIds = await _context.otherbranchaccounts
                .Where(x => x.BrId == brId)
                .Select(x => x.OtherBrId)
                .ToListAsync();

            var pendingHO = hoMappedBrIds.Count == 0
                ? new List<IBNotificationItemDTO>()
                : await _context.interbranchvoucher
                    .Where(x => x.FlowType == "BranchToBranch"
                             && x.Step2VoucherId == null
                             && x.Status != "Completed"
                             && hoMappedBrIds.Contains(x.FromBrId)
                             && hoMappedBrIds.Contains(x.DestBrId))
                    .Join(_context.branchmaster, v => v.FromBrId, b => b.id,
                          (v, b) => new { v, FromBrName = b.branchmaster_name })
                    .Join(_context.branchmaster, x => x.v.DestBrId, b => b.id,
                          (x, b) => new IBNotificationItemDTO
                          {
                              Id          = x.v.Id,
                              Type        = "pendingHO",
                              VoucherType = x.v.VoucherType,
                              Amount      = x.v.Amount,
                              FromBrName  = x.FromBrName,
                              DestBrName  = b.branchmaster_name,
                              DestAccName = x.v.DestAccName,
                          })
                    .ToListAsync();

            var allItems = incoming.Concat(pendingHO).ToList();

            return new IBNotificationDTO
            {
                IncomingCount  = incoming.Count,
                PendingHOCount = pendingHO.Count,
                Items          = allItems,
            };
        }

        // ── Queries ───────────────────────────────────────────────────────────────

        // HO pending: BranchToBranch vouchers awaiting HO settlement (step2 not done)
        public async Task<List<IBVoucherListDTO>> GetPendingForHOAsync(int hoBrId)
        {
            var list = await _context.interbranchvoucher
                .Where(x => x.FlowType == "BranchToBranch"
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

            // Pre-resolve Step 2 account names (what HO will Dr/Cr when confirming)
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
                    // Deposit: Dr = Source(FromBr)-Ref, Cr = Dest-Ref
                    // Withdrawal: Dr = Dest-Ref, Cr = Source(FromBr)-Ref  ← reversed
                    bool isWithdrawal = dto.VoucherType == "IBSavingWithdrawal";
                    var drMap = mappings.FirstOrDefault(m => m.OtherBrId == (isWithdrawal ? dto.DestBrId : dto.FromBrId));
                    var crMap = mappings.FirstOrDefault(m => m.OtherBrId == (isWithdrawal ? dto.FromBrId : dto.DestBrId));
                    if (drMap != null && accNames.TryGetValue(drMap.AccId, out var drName))
                        dto.Step2DrAccName = drName;
                    if (crMap != null && accNames.TryGetValue(crMap.AccId, out var crName))
                        dto.Step2CrAccName = crName;
                }
            }

            return list;
        }

        // Dest branch incoming:
        //   HOToBranch  — step3 not done (no HO step needed)
        //   BranchToBranch — step3 not done (dest branch can act independently; HO step2 runs in parallel)
        public async Task<List<IBVoucherListDTO>> GetIncomingForBranchAsync(int brId)
        {
            // Carry Step2BrId alongside the DTO so we can resolve the HO ref account name below
            var raw = await _context.interbranchvoucher
                .Where(x => x.DestBrId == brId
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

            // Resolve the pending Dr account name (HO reference account at the dest branch).
            // HOToBranch:    HO = fromBrId
            // BranchToBranch with step2 done:   HO = step2BrId
            // BranchToBranch with step2 pending: HO = first OtherBrId in otherbranchaccounts for this dest branch
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
