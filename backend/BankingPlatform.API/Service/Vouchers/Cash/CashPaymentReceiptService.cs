using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.Cash;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Vouchers.Cash
{
    public class CashPaymentReceiptService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly VoucherMapper _voucherMapper;

        public CashPaymentReceiptService(BankingDbContext context, CommonFunctions commonFunctions, MemberService memberService, VoucherMapper voucherMapper)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _memberService = memberService;
            _voucherMapper = voucherMapper;
        }

        public async Task<(string result, int voucherNo)> AddCashPaymentReceiptVoucher(CashPaymentReceiptDTO dto)
        {
            int nextVrNo = 0;
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                if (dto.Entries == null || dto.Entries.Count == 0)
                    return ("No entries provided.", 0);

                if (dto.CashAccountId <= 0)
                    return ("Cash account not configured.", 0);

                int branchId = dto.BrID;
                string narration = dto.VoucherNarration ?? "Cash Payment/Receipt";

                decimal totalCr = dto.Entries.Where(e => e.EntryType == "Cr").Sum(e => e.Amount);
                decimal totalDr = dto.Entries.Where(e => e.EntryType == "Dr").Sum(e => e.Amount);
                decimal netCash = totalCr - totalDr;

                if (netCash == 0)
                    return ("Net cash amount cannot be zero. Total credits and debits are equal.", 0);

                nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, dto.VoucherDate);
                bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string voucherStatus = isAutoVerification ? "V" : "A";

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
                    VoucherType = (int)Enums.VoucherType.Cash,
                    VoucherSubType = (int)Enums.VoucherSubType.PaymentReceipt,
                };

                var voucherInfo = _memberService.MapToEntity(voucherEntity);
                await _context.voucher.AddAsync(voucherInfo);
                await _context.SaveChangesAsync();

                int row = 1;

                // Create VoucherCreditDebitDetails for each user entry
                var crDrEntriesMap = new List<(CashVoucherEntryDTO entry, VoucherCreditDebitDetails crDrRecord)>();

                foreach (var entry in dto.Entries)
                {
                    long headCode = await _commonfunctions.GetAccountHeadCodeFromAccId(entry.AccountId, branchId);
                    string entryStatus = entry.EntryType == "Cr"
                        ? Enums.VoucherStatus.Cr.ToString()
                        : Enums.VoucherStatus.Dr.ToString();

                    var crDrRecord = _memberService.voucherCreditDebitDetails(
                        headCode, entry.AccountId, branchId, entryStatus,
                        narration, entry.Amount, voucherStatus, valueDate, entry.EntryType, voucherInfo.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(crDrRecord);
                    row++;

                    crDrEntriesMap.Add((entry, crDrRecord));
                }

                // Create consolidated cash account entry (mirror of net)
                long cashHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.CashAccountId, branchId);
                string cashEntryType = netCash > 0 ? "Dr" : "Cr";
                string cashEntryStatus = netCash > 0
                    ? Enums.VoucherStatus.Dr.ToString()
                    : Enums.VoucherStatus.Cr.ToString();
                decimal cashAmount = Math.Abs(netCash);

                var cashCrDr = _memberService.voucherCreditDebitDetails(
                    cashHeadCode, dto.CashAccountId, branchId, cashEntryStatus,
                    narration, cashAmount, voucherStatus, valueDate, cashEntryType, voucherInfo.Id, row);
                await _context.vouchercreditdebitdetails.AddAsync(cashCrDr);

                await _context.SaveChangesAsync();

                // Create child table entries for Saving and RD accounts
                foreach (var (entry, crDrRecord) in crDrEntriesMap)
                {
                    if (entry.AccountType == (int)Enums.AccountTypes.Saving)
                    {
                        string savingOp = entry.EntryType == "Cr" ? "SD" : "SW";
                        VoucherSavingDetail savingDetail = _voucherMapper.voucherSavingDetails(
                            branchId, entry.AccountId, 0, crDrRecord.Id, voucherInfo.Id,
                            narration, entry.Amount, voucherStatus, voucherDate, valueDate, savingOp, 0);
                        await _context.vouchersavingdetail.AddAsync(savingDetail);
                    }
                    else if (entry.AccountType == (int)Enums.AccountTypes.RD)
                    {
                        var rdAccDet = await _context.rdaccountdetail
                            .Where(x => x.BrId == branchId && x.AccId == entry.AccountId)
                            .OrderByDescending(x => x.Id)
                            .FirstOrDefaultAsync();
                        int rdAccDetId = rdAccDet?.Id ?? 0;

                        double amountCr = entry.EntryType == "Cr" ? (double)entry.Amount : 0;
                        double amountDr = entry.EntryType == "Dr" ? (double)entry.Amount : 0;
                        string rdOp = entry.EntryType == "Cr" ? "RC" : "RD";

                        VoucherRDDetail rdDetail = _voucherMapper.voucherRDDetails(
                            branchId, entry.AccountId, rdAccDetId, crDrRecord.Id, voucherInfo.Id,
                            amountCr, amountDr, rdOp, voucherStatus, voucherDate, valueDate);
                        await _context.voucherrddetail.AddAsync(rdDetail);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while saving Cash Payment/Receipt voucher.", 0);
            }

            return ("Success", nextVrNo);
        }

        public async Task<(string result, int voucherNo)> UpdateCashPaymentReceiptVoucher(int voucherId, CashPaymentReceiptDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var voucher = await _context.voucher.FirstOrDefaultAsync(x => x.Id == voucherId && x.BrID == dto.BrID);
                if (voucher == null) return ("Voucher not found.", 0);

                if (dto.Entries == null || dto.Entries.Count == 0) return ("No entries provided.", 0);
                if (dto.CashAccountId <= 0) return ("Cash account not configured.", 0);

                decimal totalCr = dto.Entries.Where(e => e.EntryType == "Cr").Sum(e => e.Amount);
                decimal totalDr = dto.Entries.Where(e => e.EntryType == "Dr").Sum(e => e.Amount);
                decimal netCash = totalCr - totalDr;
                if (netCash == 0) return ("Net cash amount cannot be zero.", 0);

                string narration = dto.VoucherNarration ?? "Cash Payment/Receipt";
                int branchId = dto.BrID;

                // Delete old child entries
                var oldSaving = await _context.vouchersavingdetail.Where(x => x.VoucherId == voucherId).ToListAsync();
                if (oldSaving.Any()) _context.vouchersavingdetail.RemoveRange(oldSaving);

                var oldRD = await _context.voucherrddetail.Where(x => x.VoucherId == voucherId).ToListAsync();
                if (oldRD.Any()) _context.voucherrddetail.RemoveRange(oldRD);

                var oldCrDr = await _context.vouchercreditdebitdetails.Where(x => x.VoucherID == voucherId).ToListAsync();
                if (oldCrDr.Any()) _context.vouchercreditdebitdetails.RemoveRange(oldCrDr);

                await _context.SaveChangesAsync();

                voucher.VoucherNarration = narration;
                voucher.ModifiedBy = int.Parse(_commonfunctions.GetCurrentUserId()!);

                DateTime voucherDate = voucher.VoucherDate;
                DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                string voucherStatus = voucher.VoucherStatus;

                int row = 1;
                var crDrEntriesMap = new List<(CashVoucherEntryDTO entry, VoucherCreditDebitDetails crDrRecord)>();

                foreach (var entry in dto.Entries)
                {
                    long headCode = await _commonfunctions.GetAccountHeadCodeFromAccId(entry.AccountId, branchId);
                    string entryStatus = entry.EntryType == "Cr" ? Enums.VoucherStatus.Cr.ToString() : Enums.VoucherStatus.Dr.ToString();

                    var crDrRecord = _memberService.voucherCreditDebitDetails(
                        headCode, entry.AccountId, branchId, entryStatus,
                        narration, entry.Amount, voucherStatus, valueDate, entry.EntryType, voucher.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(crDrRecord);
                    row++;
                    crDrEntriesMap.Add((entry, crDrRecord));
                }

                long cashHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(dto.CashAccountId, branchId);
                string cashEntryType = netCash > 0 ? "Dr" : "Cr";
                string cashEntryStatus = netCash > 0 ? Enums.VoucherStatus.Dr.ToString() : Enums.VoucherStatus.Cr.ToString();
                decimal cashAmount = Math.Abs(netCash);

                var cashCrDr = _memberService.voucherCreditDebitDetails(
                    cashHeadCode, dto.CashAccountId, branchId, cashEntryStatus,
                    narration, cashAmount, voucherStatus, valueDate, cashEntryType, voucher.Id, row);
                await _context.vouchercreditdebitdetails.AddAsync(cashCrDr);

                await _context.SaveChangesAsync();

                foreach (var (entry, crDrRecord) in crDrEntriesMap)
                {
                    if (entry.AccountType == (int)Enums.AccountTypes.Saving)
                    {
                        string savingOp = entry.EntryType == "Cr" ? "SD" : "SW";
                        VoucherSavingDetail savingDetail = _voucherMapper.voucherSavingDetails(
                            branchId, entry.AccountId, 0, crDrRecord.Id, voucher.Id,
                            narration, entry.Amount, voucherStatus, voucherDate, valueDate, savingOp, 0);
                        await _context.vouchersavingdetail.AddAsync(savingDetail);
                    }
                    else if (entry.AccountType == (int)Enums.AccountTypes.RD)
                    {
                        var rdAccDet = await _context.rdaccountdetail
                            .Where(x => x.BrId == branchId && x.AccId == entry.AccountId)
                            .OrderByDescending(x => x.Id).FirstOrDefaultAsync();

                        double amountCr = entry.EntryType == "Cr" ? (double)entry.Amount : 0;
                        double amountDr = entry.EntryType == "Dr" ? (double)entry.Amount : 0;
                        string rdOp = entry.EntryType == "Cr" ? "RC" : "RD";

                        VoucherRDDetail rdDetail = _voucherMapper.voucherRDDetails(
                            branchId, entry.AccountId, rdAccDet?.Id ?? 0, crDrRecord.Id, voucher.Id,
                            amountCr, amountDr, rdOp, voucherStatus, voucherDate, valueDate);
                        await _context.voucherrddetail.AddAsync(rdDetail);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return ("Success", voucher.VoucherNo);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while updating the Cash voucher.", 0);
            }
        }
    }
}
