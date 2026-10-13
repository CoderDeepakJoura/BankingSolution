using BankingPlatform.API.Common;
using BankingPlatform.API.DTO.InterBranch;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterBranch
{
    /// <summary>
    /// IB Pre-Mature FD / RD — saving portion routed through IB when member's saving account
    /// is at a different branch.
    ///   Step 1 (source, in FDAccountService/RDAccountService):
    ///     Dr=FD/RD Account, Cr=IB-Ref  → creates interbranchvoucher record
    ///   Step 2 (HO, BranchToBranch):
    ///     Dr=Source-Ref, Cr=Dest-Ref
    ///   Step 3 (dest branch):
    ///     Dr=HO-Ref, Cr=Customer Saving Acc  → writes vouchersavingdetail "SD"
    /// </summary>
    public class IBPreMatureService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;

        public IBPreMatureService(
            BankingDbContext context,
            CommonFunctions commonfunctions,
            MemberService memberService)
        {
            _context = context;
            _commonfunctions = commonfunctions;
            _memberService = memberService;
        }

        // ── Queries ────────────────────────────────────────────────────────────

        public async Task<List<IBVoucherListDTO>> GetIncomingForBranchAsync(int brId)
        {
            return await _context.interbranchvoucher
                .Where(x => (x.VoucherType == "IBPreMatureFD" || x.VoucherType == "IBPreMatureRD")
                         && x.DestBrId == brId
                         && x.Step3VoucherId == null
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
                    DestAccId      = x.v.DestAccId,
                    DestAccNo      = x.v.DestAccNo,
                    DestAccName    = x.v.DestAccName,
                    Step1VoucherId = x.v.Step1VoucherId,
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
        }

        public async Task<List<IBVoucherListDTO>> GetPendingForHOAsync(int hoBrId)
        {
            var hoMappedBrIds = await _context.otherbranchaccounts
                .Where(x => x.BrId == hoBrId)
                .Select(x => x.OtherBrId)
                .ToListAsync();

            var list = await _context.interbranchvoucher
                .Where(x => (x.VoucherType == "IBPreMatureFD" || x.VoucherType == "IBPreMatureRD")
                         && x.FlowType == "BranchToBranch"
                         && x.Step2VoucherId == null
                         && x.Status != "Completed"
                         && hoMappedBrIds.Contains(x.FromBrId)
                         && hoMappedBrIds.Contains(x.DestBrId))
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
                    DestAccId      = x.v.DestAccId,
                    DestAccNo      = x.v.DestAccNo,
                    DestAccName    = x.v.DestAccName,
                    Step1VoucherId = x.v.Step1VoucherId,
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

            // Pre-resolve Step 2 account names (Dr=Source-Ref, Cr=Dest-Ref — same as saving deposit)
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
                    var srcMapping  = mappings.FirstOrDefault(m => m.OtherBrId == dto.FromBrId);
                    var destMapping = mappings.FirstOrDefault(m => m.OtherBrId == dto.DestBrId);
                    if (srcMapping != null)
                        dto.Step2DrAccName = accNames.TryGetValue(srcMapping.AccId, out var n) ? n : null;
                    if (destMapping != null)
                        dto.Step2CrAccName = accNames.TryGetValue(destMapping.AccId, out var n) ? n : null;
                }
            }

            return list;
        }

        // ── Step 2: HO settlement (BranchToBranch only) ───────────────────────
        // Dr=Source-Ref, Cr=Dest-Ref  (same direction as saving deposit)
        public async Task<(bool success, string message)> ConfirmHOSettlementAsync(int ibVoucherId, IBSavingDepositStep2DTO dto)
        {
            var ibRecord = await _context.interbranchvoucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == ibVoucherId);
            if (ibRecord == null) return (false, "Inter-branch voucher not found.");
            if (ibRecord.VoucherType != "IBPreMatureFD" && ibRecord.VoucherType != "IBPreMatureRD")
                return (false, "Voucher is not an IB Pre-Mature FD/RD voucher.");
            if (ibRecord.FlowType != "BranchToBranch")
                return (false, "HO settlement is only required for Branch-to-Branch flow.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ibLocked = await _context.interbranchvoucher
                    .FromSqlInterpolated($"SELECT * FROM interbranchvoucher WHERE id = {ibVoucherId} FOR UPDATE")
                    .FirstOrDefaultAsync();
                if (ibLocked == null) return (false, "Inter-branch voucher not found.");
                if (ibLocked.Step2VoucherId.HasValue) return (false, "HO settlement has already been done for this voucher.");

                int branchId = dto.HoBrId;

                // Dr = Source-Ref at HO (account representing source branch)
                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == branchId && x.OtherBrId == ibLocked.FromBrId);
                if (drMapping == null) return (false, "No source-branch reference account configured at HO.");

                // Cr = Dest-Ref at HO (account representing dest branch)
                var crMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == branchId && x.OtherBrId == ibLocked.DestBrId);
                if (crMapping == null) return (false, "No destination-branch reference account configured at HO.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == branchId);
                if (drAcc == null) return (false, "Source-branch reference account not found at HO.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == crMapping.AccId && x.BranchId == branchId);
                if (crAcc == null) return (false, "Destination-branch reference account not found at HO.");

                DateTime voucherDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                DateTime valueDate   = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
                string narration = !string.IsNullOrWhiteSpace(dto.Narration)
                    ? dto.Narration
                    : ibLocked.Narration ?? $"HO settlement for IB Pre-Mature FD/RD — {ibLocked.DestAccName}";
                string userId = dto.UserId ?? _commonfunctions.GetCurrentUserId() ?? "0";

                int subType = ibLocked.VoucherType == "IBPreMatureFD"
                    ? (int)Enums.VoucherSubType.IBBrPreMatureStep2
                    : (int)Enums.VoucherSubType.IBBrPreMatureStep2;

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
                    TotalDebit       = ibLocked.Amount,
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
                    _memberService.voucherCreditDebitDetails(
                        drHeadCode, drMapping.AccId, branchId,
                        Enums.VoucherStatus.Dr.ToString(), narration,
                        ibLocked.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
                row++;
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(
                        crHeadCode, crMapping.AccId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), narration,
                        ibLocked.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
                await _context.SaveChangesAsync();

                DateTime.TryParse(dto.WorkingDate, out DateTime parsedWorkingDate);

                ibLocked.Status          = ibLocked.Step3VoucherId.HasValue ? "Completed" : "HOConfirmed";
                ibLocked.Step2VoucherId  = voucherEntity.Id;
                ibLocked.Step2BrId       = branchId;
                ibLocked.Step2DrAccId    = drMapping.AccId;
                ibLocked.Step2DrAccName  = drAcc.AccountName;
                ibLocked.Step2DrHeadCode = drHeadCode;
                ibLocked.Step2CrAccId    = crMapping.AccId;
                ibLocked.Step2CrAccName  = crAcc.AccountName;
                ibLocked.Step2CrHeadCode = crHeadCode;
                ibLocked.Step2Date       = voucherDate;
                ibLocked.Step2WorkingDate = parsedWorkingDate == default ? voucherDate : parsedWorkingDate;
                ibLocked.Step2UserId     = userId;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "HO settlement confirmed successfully.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred during HO pre-mature settlement.");
            }
        }

        // ── Step 3: dest branch credits customer saving account ───────────────
        // HOToBranch: this is Step 2 at dest
        // BranchToBranch: this is Step 3 at dest
        // Dr=HO-Ref, Cr=Customer Saving Acc  +  vouchersavingdetail "SD"
        public async Task<(bool success, string message)> WriteFinalVoucherAsync(int ibVoucherId, IBSavingDepositStep3DTO dto)
        {
            var ibRecord = await _context.interbranchvoucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == ibVoucherId);
            if (ibRecord == null) return (false, "Inter-branch voucher not found.");
            if (ibRecord.VoucherType != "IBPreMatureFD" && ibRecord.VoucherType != "IBPreMatureRD")
                return (false, "Voucher is not an IB Pre-Mature FD/RD voucher.");

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

                // Dr = HO-Ref at dest branch (FromBrId = HO for HOToBranch)
                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == ibRecord.FromBrId);
                if (drMapping == null) return (false, "No HO reference account configured at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "HO reference account not found at destination branch.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == ibRecord.DestAccId && x.BranchId == destBrId);
                if (crAcc == null) return (false, "Customer saving account not found at destination branch.");

                int subType = ibRecord.VoucherType == "IBPreMatureFD"
                    ? (int)Enums.VoucherSubType.IBHOPreMatureStep2
                    : (int)Enums.VoucherSubType.IBHOPreMatureStep2;

                return await WriteSavingCreditVoucherAsync(ibRecord, destBrId,
                    drMapping.AccId, drAcc.AccountName,
                    ibRecord.DestAccId, crAcc.AccountName,
                    subType, dto.WorkingDate, dto.UserId, transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB pre-mature voucher.");
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

                // Determine HO branch
                int hoBrId = ibRecord.Step2BrId
                    ?? (await _context.otherbranchaccounts
                           .Where(x => x.BrId == destBrId)
                           .Select(x => (int?)x.OtherBrId)
                           .FirstOrDefaultAsync()) ?? 0;
                if (hoBrId == 0) return (false, "No HO reference account configured at destination branch.");

                // Dr = HO-Ref at dest branch
                var drMapping = await _context.otherbranchaccounts
                    .FirstOrDefaultAsync(x => x.BrId == destBrId && x.OtherBrId == hoBrId);
                if (drMapping == null) return (false, "No HO reference account configured at destination branch.");

                var drAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == drMapping.AccId && x.BranchId == destBrId);
                if (drAcc == null) return (false, "HO reference account not found at destination branch.");

                var crAcc = await _context.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == ibRecord.DestAccId && x.BranchId == destBrId);
                if (crAcc == null) return (false, "Customer saving account not found at destination branch.");

                int subType = ibRecord.VoucherType == "IBPreMatureFD"
                    ? (int)Enums.VoucherSubType.IBBrPreMatureStep3
                    : (int)Enums.VoucherSubType.IBBrPreMatureStep3;

                return await WriteSavingCreditVoucherAsync(ibRecord, destBrId,
                    drMapping.AccId, drAcc.AccountName,
                    ibRecord.DestAccId, crAcc.AccountName,
                    subType, dto.WorkingDate, dto.UserId, transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB pre-mature voucher.");
            }
        }

        // Shared: Dr=HO-Ref, Cr=Customer Saving Acc + vouchersavingdetail "SD"
        private async Task<(bool success, string message)> WriteSavingCreditVoucherAsync(
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
                : ibRecord.Narration ?? $"IB Pre-Mature credit to {ibRecord.DestAccName}";
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
            // Dr = HO-Ref
            await _context.vouchercreditdebitdetails.AddAsync(
                _memberService.voucherCreditDebitDetails(
                    drHeadCode, drAccId, branchId,
                    Enums.VoucherStatus.Dr.ToString(), narration,
                    ibRecord.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
            row++;
            // Cr = Customer Saving Account
            var crEntry = _memberService.voucherCreditDebitDetails(
                crHeadCode, crAccId, branchId,
                Enums.VoucherStatus.Cr.ToString(), narration,
                ibRecord.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row);
            await _context.vouchercreditdebitdetails.AddAsync(crEntry);
            await _context.SaveChangesAsync();

            // vouchersavingdetail with operation "SD"
            await _context.vouchersavingdetail.AddAsync(new VoucherSavingDetail
            {
                BrId            = branchId,
                VAccCrDrId      = crEntry.Id,
                Operation       = "SD",
                AccId           = crAccId,
                Amt             = ibRecord.Amount,
                ValueDate       = valueDate,
                VoucherDate     = voucherDate,
                VoucherMainStatus = voucherStatus,
                VoucherId       = voucherEntity.Id,
            });
            await _context.SaveChangesAsync();

            DateTime.TryParse(workingDateStr, out DateTime parsedWorkingDate);

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
            return (true, "IB Pre-Mature credit to customer saving account completed successfully.");
        }
    }
}
