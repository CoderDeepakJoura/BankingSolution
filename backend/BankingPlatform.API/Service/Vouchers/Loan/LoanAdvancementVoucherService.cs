using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.GST;
using BankingPlatform.Infrastructure.Models.voucher;

namespace BankingPlatform.API.Service.Vouchers.Loan
{
    public class LoanAdvancementVoucherService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly MemberService _memberService;
        private readonly VoucherMapper _voucherMapper;

        public LoanAdvancementVoucherService(BankingDbContext context, CommonFunctions commonFunctions, MemberService memberService, VoucherMapper voucherMapper)
        {
            _context = context;
            _commonFunctions = commonFunctions;
            _memberService = memberService;
            _voucherMapper = voucherMapper;
        }

        public async Task<(string result, int voucherNo)> AddLoanAdvancementVoucherAsync(LoanAdvancementVoucherDTO dto)
        {
            int nextVrNo = 0;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.LoanAccountId <= 0 || dto.TotalAmount <= 0 || dto.CreditItems.Count == 0)
                    return ("Invalid voucher data.", 0);

                decimal creditTotal = dto.CreditItems.Sum(x => x.Amount);
                if (Math.Abs(creditTotal - dto.TotalAmount) > 0.01m)
                    return ("Total credit amount must equal the loan advancement amount.", 0);

                // Validate against sanctioned loan amount
                var kistDetail = await _context.accountkistdetail
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.AccountId == dto.LoanAccountId && x.BrId == dto.BrId);

                if (kistDetail == null)
                    return ("Loan account kist details not found.", 0);

                if (kistDetail.LoanAmountPassed.HasValue && (double)dto.TotalAmount > kistDetail.LoanAmountPassed.Value)
                    return ($"Advancement amount cannot exceed sanctioned loan amount of {kistDetail.LoanAmountPassed.Value:N2}.", 0);

                int branchId = dto.BrId;
                nextVrNo = await _commonFunctions.GetLatestVoucherNo(branchId, dto.VoucherDate);
                bool isAutoVerification = await _commonFunctions.IsAutoVerification(branchId);
                string voucherStatus = isAutoVerification ? "V" : "A";
                int currentUserId = int.Parse(_commonFunctions.GetCurrentUserId()!);
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narration = dto.Narration ?? $"Loan Advancement - {dto.VoucherDate:dd-MMM-yyyy}";

                var voucherEntity = new Infrastructure.Models.voucher.Voucher
                {
                    BrID = branchId,
                    VoucherNo = nextVrNo,
                    VoucherType = (int)Enums.VoucherType.Loan,
                    VoucherSubType = (int)Enums.VoucherSubType.LoanAdvancement,
                    VoucherDate = voucherDate,
                    ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherNarration = narration,
                    VoucherStatus = voucherStatus,
                    AddedBy = currentUserId,
                    ModifiedBy = 0,
                    VerifiedBy = isAutoVerification ? currentUserId : 0,
                    OtherBrID = 0,
                };

                await _context.voucher.AddAsync(voucherEntity);
                await _context.SaveChangesAsync();

                int voucherId = voucherEntity.Id;
                int row = 1;

                // Dr entry — loan account debited (loan is advanced)
                long loanHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(dto.LoanAccountId, branchId);
                var drEntry = _memberService.voucherCreditDebitDetails(
                    loanHeadCode, dto.LoanAccountId, branchId,
                    Enums.VoucherStatus.LA.ToString(), narration,
                    dto.TotalAmount, voucherStatus, valueDate, "Dr", voucherId, row);
                await _context.vouchercreditdebitdetails.AddAsync(drEntry);
                row++;

                // Cr entries — each credit account
                foreach (var item in dto.CreditItems)
                {
                    string itemNarration = string.IsNullOrWhiteSpace(item.Narration)
                        ? $"Loan Advancement Credit - {dto.VoucherDate:dd-MMM-yyyy}"
                        : item.Narration;

                    // Base amount = net amount (already includes tax from frontend)
                    decimal baseAmount = item.GstDetail != null && item.GstDetail.TaxLines.Count > 0
                        ? item.Amount - item.GstDetail.TaxLines.Sum(t => t.TaxAmt)
                        : item.Amount;

                    long crHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(item.AccountId, branchId);
                    var crEntry = _memberService.voucherCreditDebitDetails(
                        crHeadCode, item.AccountId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), itemNarration,
                        baseAmount, voucherStatus, valueDate, "Cr", voucherId, row);
                    await _context.vouchercreditdebitdetails.AddAsync(crEntry);
                    await _context.SaveChangesAsync();
                    row++;

                    // Saving account — insert into vouchersavingdetail
                    if (item.AccountType == (int)Enums.AccountTypes.Saving)
                    {
                        var savingDetail = _voucherMapper.voucherSavingDetails(
                            branchId, item.AccountId, 0, crEntry.Id, voucherId,
                            itemNarration, baseAmount, voucherStatus, voucherDate, valueDate, "SD", 0);
                        await _context.vouchersavingdetail.AddAsync(savingDetail);
                    }
                    // RD account — insert into voucherrddetail
                    else if (item.AccountType == (int)Enums.AccountTypes.RD)
                    {
                        var rdAccDet = await _context.rdaccountdetail
                            .Where(x => x.BrId == branchId && x.AccId == item.AccountId)
                            .OrderByDescending(x => x.Id)
                            .FirstOrDefaultAsync();

                        var rdDetail = _voucherMapper.voucherRDDetails(
                            branchId, item.AccountId, rdAccDet?.Id ?? 0, crEntry.Id, voucherId,
                            (double)baseAmount, 0, "RC", voucherStatus, voucherDate, valueDate);
                        await _context.voucherrddetail.AddAsync(rdDetail);
                    }

                    // GST entries if service is associated with this credit account
                    if (item.GstDetail != null && item.GstDetail.TaxLines.Count > 0)
                    {
                        var gst = item.GstDetail;

                        var taxForGroup = await _context.tax.AsNoTracking()
                            .FirstOrDefaultAsync(x => x.Id == gst.TaxId && x.BrId == branchId);

                        var stockMain = new StockMain
                        {
                            BrId = branchId,
                            Date = voucherDate,
                            VmId = null,
                            Narration = itemNarration,
                            TaxGroupId = taxForGroup?.TaxGroupId ?? 0,
                            IsRC = 0,
                            TotalAmount = baseAmount,
                            RoundAmount = null,
                            TransTypeId = null,
                        };
                        await _context.stockmain.AddAsync(stockMain);
                        await _context.SaveChangesAsync();

                        await _context.stockbillbookdetail.AddAsync(new StockBillBookDetail
                        {
                            BrId = branchId,
                            StockMainId = stockMain.Id,
                            BillBookId = gst.BillBookId,
                            BillNo = gst.BillNo,
                            Date = voucherDate,
                            DrAccId = dto.LoanAccountId,
                        });

                        await _context.smdetail.AddAsync(new SMDetail
                        {
                            BrId = branchId,
                            StateId = gst.StateId,
                            SupplyTypeId = gst.SupplyTypeId,
                            StockMainId = stockMain.Id,
                            GstINo = gst.GstinNo,
                            FkId = dto.LoanAccountId,
                            FkBrId = branchId,
                            FkTypeId = 1,
                        });

                        await _context.gstservicedetail.AddAsync(new GSTServiceDetail
                        {
                            BrId = branchId,
                            StockMainId = stockMain.Id,
                            ServiceId = gst.ServiceId,
                            TaxId = gst.TaxId,
                            Amount = baseAmount,
                            NetAmount = item.Amount,
                            Date = voucherDate,
                        });

                        foreach (var taxLine in gst.TaxLines)
                        {
                            await _context.stocktaxdetail.AddAsync(new StockTaxDetail
                            {
                                BrId = branchId,
                                StockMainId = stockMain.Id,
                                TaxTypeId = taxLine.TaxTypeId,
                                TaxPerc = taxLine.Perc,
                                TaxAmt = taxLine.TaxAmt,
                            });

                            if (taxLine.AccId > 0 && taxLine.TaxAmt > 0)
                            {
                                long taxHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(taxLine.AccId, branchId);
                                var taxCrEntry = _memberService.voucherCreditDebitDetails(
                                    taxHeadCode, taxLine.AccId, branchId,
                                    Enums.VoucherStatus.Cr.ToString(), $"GST - {taxLine.TaxTypeName}",
                                    taxLine.TaxAmt, voucherStatus, valueDate, "Cr", voucherId, row++);
                                await _context.vouchercreditdebitdetails.AddAsync(taxCrEntry);
                            }
                        }
                        await _context.SaveChangesAsync();
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while saving the voucher.", 0);
            }

            return ("Success", nextVrNo);
        }

        public async Task<(string result, int voucherNo)> UpdateLoanAdvancementVoucherAsync(int voucherId, LoanAdvancementVoucherDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var voucher = await _context.voucher
                    .FirstOrDefaultAsync(x => x.Id == voucherId && x.BrID == dto.BrId);

                if (voucher == null) return ("Voucher not found.", 0);

                if (dto.LoanAccountId <= 0 || dto.TotalAmount <= 0 || dto.CreditItems.Count == 0)
                    return ("Invalid voucher data.", 0);

                decimal creditTotal = dto.CreditItems.Sum(x => x.Amount);
                if (Math.Abs(creditTotal - dto.TotalAmount) > 0.01m)
                    return ("Total credit amount must equal the loan advancement amount.", 0);

                // Remove existing saving/RD detail entries (RESTRICT-constrained) before credit/debit details
                var savingDetails = await _context.vouchersavingdetail
                    .Where(x => x.VoucherId == voucherId).ToListAsync();
                if (savingDetails.Any()) _context.vouchersavingdetail.RemoveRange(savingDetails);

                var rdDetails = await _context.voucherrddetail
                    .Where(x => x.VoucherId == voucherId).ToListAsync();
                if (rdDetails.Any()) _context.voucherrddetail.RemoveRange(rdDetails);

                var oldEntries = await _context.vouchercreditdebitdetails
                    .Where(x => x.VoucherID == voucherId).ToListAsync();
                _context.vouchercreditdebitdetails.RemoveRange(oldEntries);

                int branchId = dto.BrId;
                string narration = dto.Narration ?? $"Loan Advancement - {dto.VoucherDate:dd-MMM-yyyy}";
                string voucherStatus = voucher.VoucherStatus;
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                int currentUserId = int.Parse(_commonFunctions.GetCurrentUserId()!);

                voucher.VoucherNarration = narration;
                voucher.ModifiedBy = currentUserId;

                await _context.SaveChangesAsync();

                int row = 1;

                // Dr entry — loan account debited
                long loanHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(dto.LoanAccountId, branchId);
                var drEntry = _memberService.voucherCreditDebitDetails(
                    loanHeadCode, dto.LoanAccountId, branchId,
                    Enums.VoucherStatus.LA.ToString(), narration,
                    dto.TotalAmount, voucherStatus, valueDate, "Dr", voucherId, row);
                await _context.vouchercreditdebitdetails.AddAsync(drEntry);
                row++;

                // Cr entries
                foreach (var item in dto.CreditItems)
                {
                    string itemNarration = string.IsNullOrWhiteSpace(item.Narration)
                        ? $"Loan Advancement Credit - {dto.VoucherDate:dd-MMM-yyyy}"
                        : item.Narration;

                    long crHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(item.AccountId, branchId);
                    var crEntry = _memberService.voucherCreditDebitDetails(
                        crHeadCode, item.AccountId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), itemNarration,
                        item.Amount, voucherStatus, valueDate, "Cr", voucherId, row);
                    await _context.vouchercreditdebitdetails.AddAsync(crEntry);
                    await _context.SaveChangesAsync();
                    row++;

                    if (item.AccountType == (int)Enums.AccountTypes.Saving)
                    {
                        var savingDetail = _voucherMapper.voucherSavingDetails(
                            branchId, item.AccountId, 0, crEntry.Id, voucherId,
                            itemNarration, item.Amount, voucherStatus, voucherDate, valueDate, "SD", 0);
                        await _context.vouchersavingdetail.AddAsync(savingDetail);
                    }
                    else if (item.AccountType == (int)Enums.AccountTypes.RD)
                    {
                        var rdAccDet = await _context.rdaccountdetail
                            .Where(x => x.BrId == branchId && x.AccId == item.AccountId)
                            .OrderByDescending(x => x.Id)
                            .FirstOrDefaultAsync();

                        var rdDetail = _voucherMapper.voucherRDDetails(
                            branchId, item.AccountId, rdAccDet?.Id ?? 0, crEntry.Id, voucherId,
                            (double)item.Amount, 0, "RC", voucherStatus, voucherDate, valueDate);
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
                return (ex.Message ?? "An error occurred while updating the voucher.", 0);
            }
        }
    }
}
