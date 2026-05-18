using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.RD;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Vouchers.RD
{
    public class RDKistVoucherService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly VoucherMapper _voucherMapper;

        public RDKistVoucherService(BankingDbContext context, CommonFunctions commonFunctions, MemberService memberService, VoucherMapper voucherMapper)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _memberService = memberService;
            _voucherMapper = voucherMapper;
        }

        public async Task<(string result, int voucherNo)> AddRDKistVoucher(RDKistVoucherDTO dto)
        {
            int nextVrNo = 0;
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                int branchId = dto.BrID;
                int rdAccountId = dto.RdAccountId;
                decimal totalAmount = dto.TotalAmount;
                decimal fromSavingAmount = dto.FromSavingAmount;
                decimal debitAmount = totalAmount - fromSavingAmount;
                string narration = dto.VoucherNarration ?? $"RD Kist - Amount: {totalAmount}";

                nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, dto.VoucherDate);
                bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);

                var rdAccDet = await _context.rdaccountdetail
                    .Where(x => x.BrId == branchId && x.AccId == rdAccountId)
                    .OrderByDescending(x => x.Id)
                    .FirstOrDefaultAsync();

                int rdAccDetId = rdAccDet?.Id ?? 0;

                var voucherEntity = new VoucherDTO
                {
                    ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate = voucherDate,
                    AddedBy = int.Parse(_commonfunctions.GetCurrentUserId()!),
                    BrID = branchId,
                    ModifiedBy = 0,
                    VerifiedBy = isAutoVerification ? int.Parse(_commonfunctions.GetCurrentUserId()!) : 0,
                    VoucherNarration = narration,
                    OtherBrID = 0,
                    VoucherNo = nextVrNo,
                    VoucherStatus = isAutoVerification ? "V" : "A",
                    VoucherType = (int)Enums.VoucherType.RD,
                    VoucherSubType = (int)Enums.VoucherSubType.Kist,
                };

                var voucherInfo = _memberService.MapToEntity(voucherEntity);
                await _context.voucher.AddAsync(voucherInfo);
                await _context.SaveChangesAsync();

                int row = 1;
                string voucherStatus = voucherEntity.VoucherStatus;

                var rdAccName = await _context.accountmaster
                    .Where(x => x.ID == rdAccountId && x.BranchId == branchId)
                    .Select(x => x.AccountName).FirstOrDefaultAsync() ?? rdAccountId.ToString();

                var savingAccName = dto.SavingAccountId.HasValue
                    ? (await _context.accountmaster
                        .Where(x => x.ID == dto.SavingAccountId.Value && x.BranchId == branchId)
                        .Select(x => x.AccountName).FirstOrDefaultAsync() ?? dto.SavingAccountId.ToString())
                    : "";

                var debitAccName = dto.DebitAccountId.HasValue
                    ? (await _context.accountmaster
                        .Where(x => x.ID == dto.DebitAccountId.Value && x.BranchId == branchId)
                        .Select(x => x.AccountName).FirstOrDefaultAsync() ?? dto.DebitAccountId.ToString())
                    : "";

                string crNarration = $"RD Kist Cr - {rdAccName}, Amt: {totalAmount}";
                string drSavingNarration = $"RD Kist Dr (Saving) - {savingAccName}, Amt: {fromSavingAmount}";
                string drCashNarration = $"RD Kist Dr (Cash) - {debitAccName}, Amt: {debitAmount}";

                // Cr: RD account — total amount
                var crRdAcc = await _commonfunctions.GetAccountHeadCodeFromAccId(rdAccountId, branchId);
                VoucherCreditDebitDetails voucherCrRD = _memberService.voucherCreditDebitDetails(
                    crRdAcc, rdAccountId, branchId, Enums.VoucherStatus.Cr.ToString(),
                    crNarration, totalAmount, voucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                await _context.vouchercreditdebitdetails.AddAsync(voucherCrRD);
                row++;

                // Dr: Saving account (if fromSavingAmount > 0)
                VoucherCreditDebitDetails? voucherDrSaving = null;
                if (fromSavingAmount > 0 && dto.SavingAccountId.HasValue)
                {
                    var drSavingAcc = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.SavingAccountId.Value, branchId);
                    voucherDrSaving = _memberService.voucherCreditDebitDetails(
                        drSavingAcc, dto.SavingAccountId.Value, branchId, Enums.VoucherStatus.Dr.ToString(),
                        drSavingNarration, fromSavingAmount, voucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(voucherDrSaving);
                    row++;
                }

                // Dr: Debit/Cash account (if remaining > 0)
                VoucherCreditDebitDetails? voucherDrCash = null;
                if (debitAmount > 0 && dto.DebitAccountId.HasValue)
                {
                    var drCashAcc = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.DebitAccountId.Value, branchId);
                    voucherDrCash = _memberService.voucherCreditDebitDetails(
                        drCashAcc, dto.DebitAccountId.Value, branchId, Enums.VoucherStatus.Dr.ToString(),
                        drCashNarration, debitAmount, voucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(voucherDrCash);
                }

                await _context.SaveChangesAsync();

                // VoucherRDDetail — linked to the Cr entry
                VoucherRDDetail voucherRDDetail = _voucherMapper.voucherRDDetails(
                    branchId, rdAccountId, rdAccDetId, voucherCrRD.Id, voucherInfo.Id,
                    (double)totalAmount, 0, "RC", voucherStatus, voucherDate, valueDate,
                    dto.PenaltyAmount > 0 ? dto.PenaltyAmount : null);
                await _context.voucherrddetail.AddAsync(voucherRDDetail);

                // VoucherSavingDetail — linked to the Dr saving entry
                if (fromSavingAmount > 0 && voucherDrSaving != null && dto.SavingAccountId.HasValue)
                {
                    VoucherSavingDetail voucherSavingDetail = _voucherMapper.voucherSavingDetails(
                        branchId, dto.SavingAccountId.Value, 0, voucherDrSaving.Id, voucherInfo.Id,
                        narration, fromSavingAmount, voucherStatus, voucherDate, valueDate, "SW", 0);
                    await _context.vouchersavingdetail.AddAsync(voucherSavingDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while saving RD Kist entry.", 0);
            }

            return ("Success", nextVrNo);
        }

        public async Task<(string result, int voucherNo)> UpdateRDKistVoucher(int voucherId, RDKistVoucherDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                int branchId = dto.BrID;
                var voucher = await _context.voucher.FirstOrDefaultAsync(x => x.Id == voucherId && x.BrID == branchId);
                if (voucher == null) return ("Voucher not found.", 0);

                // Delete existing RD detail entries (RESTRICT-constrained)
                var oldRdDetails = await _context.voucherrddetail.Where(x => x.VoucherId == voucherId).ToListAsync();
                if (oldRdDetails.Any()) _context.voucherrddetail.RemoveRange(oldRdDetails);

                // Delete existing saving detail entries
                var oldSavingDetails = await _context.vouchersavingdetail.Where(x => x.VoucherId == voucherId).ToListAsync();
                if (oldSavingDetails.Any()) _context.vouchersavingdetail.RemoveRange(oldSavingDetails);

                // Delete existing credit/debit entries
                var oldCrDrDetails = await _context.vouchercreditdebitdetails.Where(x => x.VoucherID == voucherId).ToListAsync();
                if (oldCrDrDetails.Any()) _context.vouchercreditdebitdetails.RemoveRange(oldCrDrDetails);

                // Flush RESTRICT-constrained children first
                await _context.SaveChangesAsync();

                int rdAccountId = dto.RdAccountId;
                decimal totalAmount = dto.TotalAmount;
                decimal fromSavingAmount = dto.FromSavingAmount;
                decimal debitAmount = totalAmount - fromSavingAmount;
                string narration = dto.VoucherNarration ?? $"RD Kist - Amount: {totalAmount}";

                // Update voucher narration and modifier
                voucher.VoucherNarration = narration;
                voucher.ModifiedBy = int.Parse(_commonfunctions.GetCurrentUserId()!);

                DateTime voucherDate = voucher.VoucherDate;
                DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                string voucherStatus = voucher.VoucherStatus;

                var rdAccDet = await _context.rdaccountdetail
                    .Where(x => x.BrId == branchId && x.AccId == rdAccountId)
                    .OrderByDescending(x => x.Id)
                    .FirstOrDefaultAsync();

                int rdAccDetId = rdAccDet?.Id ?? 0;

                var rdAccName = await _context.accountmaster
                    .Where(x => x.ID == rdAccountId && x.BranchId == branchId)
                    .Select(x => x.AccountName).FirstOrDefaultAsync() ?? rdAccountId.ToString();

                var savingAccName = dto.SavingAccountId.HasValue
                    ? (await _context.accountmaster
                        .Where(x => x.ID == dto.SavingAccountId.Value && x.BranchId == branchId)
                        .Select(x => x.AccountName).FirstOrDefaultAsync() ?? dto.SavingAccountId.ToString())
                    : "";

                var debitAccName = dto.DebitAccountId.HasValue
                    ? (await _context.accountmaster
                        .Where(x => x.ID == dto.DebitAccountId.Value && x.BranchId == branchId)
                        .Select(x => x.AccountName).FirstOrDefaultAsync() ?? dto.DebitAccountId.ToString())
                    : "";

                string crNarration = $"RD Kist Cr - {rdAccName}, Amt: {totalAmount}";
                string drSavingNarration = $"RD Kist Dr (Saving) - {savingAccName}, Amt: {fromSavingAmount}";
                string drCashNarration = $"RD Kist Dr (Cash) - {debitAccName}, Amt: {debitAmount}";

                int row = 1;

                // Cr: RD account — total amount
                var crRdAcc = await _commonfunctions.GetAccountHeadCodeFromAccId(rdAccountId, branchId);
                VoucherCreditDebitDetails voucherCrRD = _memberService.voucherCreditDebitDetails(
                    crRdAcc, rdAccountId, branchId, Enums.VoucherStatus.Cr.ToString(),
                    crNarration, totalAmount, voucherStatus, valueDate, "Cr", voucher.Id, row);
                await _context.vouchercreditdebitdetails.AddAsync(voucherCrRD);
                row++;

                // Dr: Saving account (if fromSavingAmount > 0)
                VoucherCreditDebitDetails? voucherDrSaving = null;
                if (fromSavingAmount > 0 && dto.SavingAccountId.HasValue)
                {
                    var drSavingAcc = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.SavingAccountId.Value, branchId);
                    voucherDrSaving = _memberService.voucherCreditDebitDetails(
                        drSavingAcc, dto.SavingAccountId.Value, branchId, Enums.VoucherStatus.Dr.ToString(),
                        drSavingNarration, fromSavingAmount, voucherStatus, valueDate, "Dr", voucher.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(voucherDrSaving);
                    row++;
                }

                // Dr: Debit/Cash account (if remaining > 0)
                VoucherCreditDebitDetails? voucherDrCash = null;
                if (debitAmount > 0 && dto.DebitAccountId.HasValue)
                {
                    var drCashAcc = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.DebitAccountId.Value, branchId);
                    voucherDrCash = _memberService.voucherCreditDebitDetails(
                        drCashAcc, dto.DebitAccountId.Value, branchId, Enums.VoucherStatus.Dr.ToString(),
                        drCashNarration, debitAmount, voucherStatus, valueDate, "Dr", voucher.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(voucherDrCash);
                }

                await _context.SaveChangesAsync();

                // VoucherRDDetail — linked to the Cr entry
                VoucherRDDetail voucherRDDetail = _voucherMapper.voucherRDDetails(
                    branchId, rdAccountId, rdAccDetId, voucherCrRD.Id, voucher.Id,
                    (double)totalAmount, 0, "RC", voucherStatus, voucherDate, valueDate,
                    dto.PenaltyAmount > 0 ? dto.PenaltyAmount : null);
                await _context.voucherrddetail.AddAsync(voucherRDDetail);

                // VoucherSavingDetail — linked to the Dr saving entry
                if (fromSavingAmount > 0 && voucherDrSaving != null && dto.SavingAccountId.HasValue)
                {
                    VoucherSavingDetail voucherSavingDetail = _voucherMapper.voucherSavingDetails(
                        branchId, dto.SavingAccountId.Value, 0, voucherDrSaving.Id, voucher.Id,
                        narration, fromSavingAmount, voucherStatus, voucherDate, valueDate, "SW", 0);
                    await _context.vouchersavingdetail.AddAsync(voucherSavingDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return ("Success", voucher.VoucherNo);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while updating RD Kist entry.", 0);
            }
        }
    }
}
