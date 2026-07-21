using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.RD;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Vouchers.RD
{
    public class RDMultipleKistVoucherService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly VoucherMapper _voucherMapper;

        public RDMultipleKistVoucherService(
            BankingDbContext context,
            CommonFunctions commonFunctions,
            MemberService memberService,
            VoucherMapper voucherMapper)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _memberService = memberService;
            _voucherMapper = voucherMapper;
        }

        public async Task<(string result, int voucherNo)> AddAsync(RDMultipleKistVoucherDTO dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return ("No kist items provided.", 0);

            int nextVrNo = 0;
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int branchId = dto.BrID;
                nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, dto.VoucherDate);
                bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                string voucherStatus = isAutoVerification ? "V" : "A";
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narration = dto.VoucherNarration ?? $"RD Multiple Kist - {dto.Items.Count} accounts";
                decimal totalAmount = dto.Items.Sum(x => x.KistAmount);

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
                    VoucherStatus = voucherStatus,
                    VoucherType = (int)Enums.VoucherType.RD,
                    VoucherSubType = (int)Enums.VoucherSubType.MultipleKist,
                };

                var voucherInfo = _memberService.MapToEntity(voucherEntity);
                await _context.voucher.AddAsync(voucherInfo);
                await _context.SaveChangesAsync();

                int row = 1;

                // Cr: one entry per RD account + one voucherrddetail each
                var rdDetailsCache = new List<(int AccountId, int RdAccDetId, VoucherRDDetail RdDetail)>();
                foreach (var item in dto.Items)
                {
                    var rdAccDet = await _context.rdaccountdetail
                        .Where(x => x.BrId == branchId && x.AccId == item.RdAccountId)
                        .OrderByDescending(x => x.Id)
                        .FirstOrDefaultAsync();

                    int rdAccDetId = rdAccDet?.Id ?? 0;

                    var rdAccName = await _context.accountmaster
                        .Where(x => x.ID == item.RdAccountId && x.BranchId == branchId)
                        .Select(x => x.AccountName)
                        .FirstOrDefaultAsync() ?? item.RdAccountId.ToString();

                    long crHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(item.RdAccountId, branchId);
                    var crEntry = _memberService.voucherCreditDebitDetails(
                        crHeadCode, item.RdAccountId, branchId,
                        Enums.VoucherStatus.Cr.ToString(),
                        $"RD Kist Cr - {rdAccName}, Amt: {item.KistAmount}",
                        item.KistAmount, voucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(crEntry);
                    await _context.SaveChangesAsync();

                    VoucherRDDetail rdDetail = _voucherMapper.voucherRDDetails(
                        branchId, item.RdAccountId, rdAccDetId,
                        crEntry.Id, voucherInfo.Id,
                        (double)item.KistAmount, 0, "RC", voucherStatus,
                        voucherDate, valueDate);
                    await _context.voucherrddetail.AddAsync(rdDetail);

                    row++;
                }

                await _context.SaveChangesAsync();

                // Dr: single debit entry for total amount
                var debitAccName = await _context.accountmaster
                    .Where(x => x.ID == dto.DebitAccountId && x.BranchId == branchId)
                    .Select(x => x.AccountName)
                    .FirstOrDefaultAsync() ?? dto.DebitAccountId.ToString();

                long drHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.DebitAccountId, branchId);
                var drEntry = _memberService.voucherCreditDebitDetails(
                    drHeadCode, dto.DebitAccountId, branchId,
                    Enums.VoucherStatus.Dr.ToString(),
                    $"RD Multiple Kist Dr - {debitAccName}, Amt: {totalAmount}",
                    totalAmount, voucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                await _context.vouchercreditdebitdetails.AddAsync(drEntry);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while saving RD Multiple Kist.", 0);
            }

            return ("Success", nextVrNo);
        }

        public async Task<(string result, int voucherNo)> UpdateAsync(int voucherId, RDMultipleKistVoucherDTO dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return ("No kist items provided.", 0);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int branchId = dto.BrID;
                var voucher = await _context.voucher.FirstOrDefaultAsync(x => x.Id == voucherId && x.BrID == branchId);
                if (voucher == null) return ("Voucher not found.", 0);

                // Delete RESTRICT-constrained children first
                var oldRdDetails = await _context.voucherrddetail.Where(x => x.VoucherId == voucherId).ToListAsync();
                if (oldRdDetails.Any()) _context.voucherrddetail.RemoveRange(oldRdDetails);

                var oldCrDr = await _context.vouchercreditdebitdetails.Where(x => x.VoucherID == voucherId).ToListAsync();
                if (oldCrDr.Any()) _context.vouchercreditdebitdetails.RemoveRange(oldCrDr);

                await _context.SaveChangesAsync();

                string narration = dto.VoucherNarration ?? $"RD Multiple Kist - {dto.Items.Count} accounts";
                decimal totalAmount = dto.Items.Sum(x => x.KistAmount);
                voucher.VoucherNarration = narration;
                voucher.ModifiedBy = int.Parse(_commonfunctions.GetCurrentUserId()!);

                DateTime voucherDate = voucher.VoucherDate;
                DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                string voucherStatus = voucher.VoucherStatus;
                int row = 1;

                foreach (var item in dto.Items)
                {
                    var rdAccDet = await _context.rdaccountdetail
                        .Where(x => x.BrId == branchId && x.AccId == item.RdAccountId)
                        .OrderByDescending(x => x.Id)
                        .FirstOrDefaultAsync();

                    int rdAccDetId = rdAccDet?.Id ?? 0;

                    var rdAccName = await _context.accountmaster
                        .Where(x => x.ID == item.RdAccountId && x.BranchId == branchId)
                        .Select(x => x.AccountName)
                        .FirstOrDefaultAsync() ?? item.RdAccountId.ToString();

                    long crHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(item.RdAccountId, branchId);
                    var crEntry = _memberService.voucherCreditDebitDetails(
                        crHeadCode, item.RdAccountId, branchId,
                        Enums.VoucherStatus.Cr.ToString(),
                        $"RD Kist Cr - {rdAccName}, Amt: {item.KistAmount}",
                        item.KistAmount, voucherStatus, valueDate, "Cr", voucher.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(crEntry);
                    await _context.SaveChangesAsync();

                    var rdDetail = _voucherMapper.voucherRDDetails(
                        branchId, item.RdAccountId, rdAccDetId,
                        crEntry.Id, voucher.Id,
                        (double)item.KistAmount, 0, "RC", voucherStatus,
                        voucherDate, valueDate);
                    await _context.voucherrddetail.AddAsync(rdDetail);
                    row++;
                }

                await _context.SaveChangesAsync();

                var debitAccName = await _context.accountmaster
                    .Where(x => x.ID == dto.DebitAccountId && x.BranchId == branchId)
                    .Select(x => x.AccountName)
                    .FirstOrDefaultAsync() ?? dto.DebitAccountId.ToString();

                long drHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.DebitAccountId, branchId);
                var drEntry = _memberService.voucherCreditDebitDetails(
                    drHeadCode, dto.DebitAccountId, branchId,
                    Enums.VoucherStatus.Dr.ToString(),
                    $"RD Multiple Kist Dr - {debitAccName}, Amt: {totalAmount}",
                    totalAmount, voucherStatus, valueDate, "Dr", voucher.Id, row);
                await _context.vouchercreditdebitdetails.AddAsync(drEntry);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return ("Success", voucher.VoucherNo);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while updating RD Multiple Kist.", 0);
            }
        }
    }
}
