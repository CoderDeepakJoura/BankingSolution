using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.Journal;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.GST;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Vouchers.Journal
{
    public class JournalVoucherService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly VoucherMapper _voucherMapper;

        public JournalVoucherService(BankingDbContext context, CommonFunctions commonFunctions, MemberService memberService, VoucherMapper voucherMapper)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _memberService = memberService;
            _voucherMapper = voucherMapper;
        }

        public async Task<(string result, int voucherNo)> AddJournalVoucher(JournalVoucherDTO dto)
        {
            int nextVrNo = 0;
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.Entries == null || dto.Entries.Count == 0)
                    return ("No entries provided.", 0);

                decimal totalGstTax = dto.Entries
                    .Where(e => e.EntryType == "Cr" && e.GstDetail != null)
                    .Sum(e => e.TotalTax);

                decimal totalCr = dto.Entries.Where(e => e.EntryType == "Cr").Sum(e => e.Amount) + totalGstTax;
                decimal totalDr = dto.Entries.Where(e => e.EntryType == "Dr").Sum(e => e.Amount);

                if (totalCr != totalDr)
                    return ("Journal voucher is not balanced. Total Credits must equal Total Debits.", 0);

                if (totalCr == 0)
                    return ("Voucher amounts cannot be zero.", 0);

                int branchId = dto.BrID;
                string narration = dto.VoucherNarration ?? "Journal / Transfer";

                var balErr = await CheckPersonalAccountBalances(dto.Entries, branchId);
                if (balErr != null) return (balErr, 0);

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
                    VoucherType = (int)Enums.VoucherType.Journal,
                    VoucherSubType = (int)Enums.VoucherSubType.Transfer,
                };

                var voucherInfo = _memberService.MapToEntity(voucherEntity);
                await _context.voucher.AddAsync(voucherInfo);
                await _context.SaveChangesAsync();

                int row = 1;
                var crDrEntriesMap = new List<(JournalVoucherEntryDTO entry, VoucherCreditDebitDetails crDrRecord)>();

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

                await _context.SaveChangesAsync();

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

                        double amountCr = entry.EntryType == "Cr" ? (double)entry.Amount : 0;
                        double amountDr = entry.EntryType == "Dr" ? (double)entry.Amount : 0;
                        string rdOp = entry.EntryType == "Cr" ? "RC" : "RD";

                        VoucherRDDetail rdDetail = _voucherMapper.voucherRDDetails(
                            branchId, entry.AccountId, rdAccDet?.Id ?? 0, crDrRecord.Id, voucherInfo.Id,
                            amountCr, amountDr, rdOp, voucherStatus, voucherDate, valueDate);
                        await _context.voucherrddetail.AddAsync(rdDetail);
                    }
                }

                await _context.SaveChangesAsync();

                // GST processing for Cr entries that have a service
                foreach (var entry in dto.Entries.Where(e => e.EntryType == "Cr" && e.GstDetail != null && e.TotalTax > 0))
                {
                    row = await ProcessGstEntries(entry.GstDetail!, entry.Amount, entry.Amount + entry.TotalTax,
                        entry.AccountId, branchId, voucherInfo.Id, voucherDate, valueDate,
                        narration, voucherStatus, row);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while saving the Journal voucher.", 0);
            }

            return ("Success", nextVrNo);
        }

        public async Task<(string result, int voucherNo)> UpdateJournalVoucher(int voucherId, JournalVoucherDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var voucher = await _context.voucher.FirstOrDefaultAsync(x => x.Id == voucherId && x.BrID == dto.BrID);
                if (voucher == null) return ("Voucher not found.", 0);

                if (dto.Entries == null || dto.Entries.Count == 0) return ("No entries provided.", 0);

                decimal totalGstTax = dto.Entries
                    .Where(e => e.EntryType == "Cr" && e.GstDetail != null)
                    .Sum(e => e.TotalTax);

                decimal totalCr = dto.Entries.Where(e => e.EntryType == "Cr").Sum(e => e.Amount) + totalGstTax;
                decimal totalDr = dto.Entries.Where(e => e.EntryType == "Dr").Sum(e => e.Amount);

                if (totalCr != totalDr) return ("Journal voucher is not balanced. Total Credits must equal Total Debits.", 0);
                if (totalCr == 0) return ("Voucher amounts cannot be zero.", 0);

                string narration = dto.VoucherNarration ?? "Journal / Transfer";
                int branchId = dto.BrID;

                // Remove old GST stock entries linked to this voucher
                var oldStockMains = await _context.stockmain
                    .Where(x => x.VmId == voucherId && x.BrId == branchId)
                    .ToListAsync();
                foreach (var sm in oldStockMains)
                {
                    var td = await _context.stocktaxdetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                    if (td.Any()) _context.stocktaxdetail.RemoveRange(td);
                    var sd = await _context.gstservicedetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                    if (sd.Any()) _context.gstservicedetail.RemoveRange(sd);
                    var smd = await _context.smdetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                    if (smd.Any()) _context.smdetail.RemoveRange(smd);
                    var bbd = await _context.stockbillbookdetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                    if (bbd.Any()) _context.stockbillbookdetail.RemoveRange(bbd);
                }
                if (oldStockMains.Any()) _context.stockmain.RemoveRange(oldStockMains);

                var oldSaving = await _context.vouchersavingdetail.Where(x => x.VoucherId == voucherId).ToListAsync();
                if (oldSaving.Any()) _context.vouchersavingdetail.RemoveRange(oldSaving);

                var oldRD = await _context.voucherrddetail.Where(x => x.VoucherId == voucherId).ToListAsync();
                if (oldRD.Any()) _context.voucherrddetail.RemoveRange(oldRD);

                var oldCrDr = await _context.vouchercreditdebitdetails.Where(x => x.VoucherID == voucherId).ToListAsync();
                if (oldCrDr.Any()) _context.vouchercreditdebitdetails.RemoveRange(oldCrDr);

                await _context.SaveChangesAsync();

                // Balance check after removing old entries so we see the clean balance
                var balErr = await CheckPersonalAccountBalances(dto.Entries, branchId);
                if (balErr != null) return (balErr, 0);

                voucher.VoucherNarration = narration;
                voucher.ModifiedBy = int.Parse(_commonfunctions.GetCurrentUserId()!);

                DateTime voucherDate = voucher.VoucherDate;
                DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                string voucherStatus = voucher.VoucherStatus;

                int row = 1;
                var crDrEntriesMap = new List<(JournalVoucherEntryDTO entry, VoucherCreditDebitDetails crDrRecord)>();

                foreach (var entry in dto.Entries)
                {
                    long headCode = await _commonfunctions.GetAccountHeadCodeFromAccId(entry.AccountId, branchId);
                    string entryStatus = entry.EntryType == "Cr"
                        ? Enums.VoucherStatus.Cr.ToString()
                        : Enums.VoucherStatus.Dr.ToString();

                    var crDrRecord = _memberService.voucherCreditDebitDetails(
                        headCode, entry.AccountId, branchId, entryStatus,
                        narration, entry.Amount, voucherStatus, valueDate, entry.EntryType, voucher.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(crDrRecord);
                    row++;
                    crDrEntriesMap.Add((entry, crDrRecord));
                }

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

                // GST processing for Cr entries that have a service
                foreach (var entry in dto.Entries.Where(e => e.EntryType == "Cr" && e.GstDetail != null && e.TotalTax > 0))
                {
                    row = await ProcessGstEntries(entry.GstDetail!, entry.Amount, entry.Amount + entry.TotalTax,
                        entry.AccountId, branchId, voucher.Id, voucherDate, valueDate,
                        narration, voucherStatus, row);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return ("Success", voucher.VoucherNo);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while updating the Journal voucher.", 0);
            }
        }

        private async Task<string?> CheckPersonalAccountBalances(List<JournalVoucherEntryDTO> entries, int branchId)
        {
            int[] personalTypes = {
                (int)Enums.AccountTypes.Saving,
                (int)Enums.AccountTypes.ShareMoney,
                (int)Enums.AccountTypes.RD,
                (int)Enums.AccountTypes.FD,
            };

            foreach (var entry in entries.Where(e => e.EntryType == "Dr" && personalTypes.Contains(e.AccountType)))
            {
                decimal crTot = await _context.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == entry.AccountId
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                             && x.VoucherEntryType == "Cr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;

                decimal drTot = await _context.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == entry.AccountId
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                             && x.VoucherEntryType == "Dr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;

                // For FD accounts, also include per-detail opening balance
                decimal fdOpeningBal = 0;
                if (entry.AccountType == (int)Enums.AccountTypes.FD)
                {
                    var fdDetails = await _context.fdaccountdetail
                        .Where(x => x.AccountId == entry.AccountId && x.BranchId == branchId && x.OpeningBalance != null)
                        .Select(x => new { x.OpeningBalance, x.OpeningBalanceType })
                        .ToListAsync();
                    fdOpeningBal = fdDetails.Sum(x =>
                        x.OpeningBalanceType?.ToUpper() == "CR"
                            ? (x.OpeningBalance ?? 0)
                            : -(x.OpeningBalance ?? 0));
                }

                decimal bal = crTot - drTot + fdOpeningBal;
                if (entry.Amount > bal)
                {
                    var accName = await _context.accountmaster
                        .Where(x => x.ID == entry.AccountId)
                        .Select(x => x.AccountName)
                        .FirstOrDefaultAsync() ?? entry.AccountId.ToString();
                    return $"Insufficient balance for account '{accName}'. Available: ₹{bal:N2}, Required: ₹{entry.Amount:N2}";
                }
            }
            return null;
        }

        public async Task<List<JournalVoucherGSTRestoreItemDTO>> GetGstRestoreDetails(int voucherId, int branchId)
        {
            var stockMains = await _context.stockmain.AsNoTracking()
                .Where(x => x.VmId == voucherId && x.BrId == branchId)
                .ToListAsync();

            var result = new List<JournalVoucherGSTRestoreItemDTO>();

            foreach (var sm in stockMains)
            {
                var bbd = await _context.stockbillbookdetail.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.StockMainId == sm.Id);
                var smd = await _context.smdetail.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.StockMainId == sm.Id);
                var gsd = await _context.gstservicedetail.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.StockMainId == sm.Id);
                var taxLines = await _context.stocktaxdetail.AsNoTracking()
                    .Where(x => x.StockMainId == sm.Id)
                    .ToListAsync();

                if (bbd == null || smd == null || gsd == null) continue;

                var state = await _context.state.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.id == smd.StateId);
                var service = await _context.service.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == gsd.ServiceId);
                var tax = await _context.tax.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == gsd.TaxId && x.BrId == branchId);

                var taxLineDTOs = new List<TaxLineDTO>();
                decimal totalTax = 0;

                foreach (var tl in taxLines)
                {
                    var taxType = await _context.taxtype.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == tl.TaxTypeId);
                    taxLineDTOs.Add(new TaxLineDTO
                    {
                        TaxTypeId = tl.TaxTypeId,
                        TaxTypeName = taxType?.Description,
                        Perc = tl.TaxPerc,
                        TaxAmt = tl.TaxAmt,
                        AccId = taxType?.InAccId ?? 0,
                    });
                    totalTax += tl.TaxAmt;
                }

                result.Add(new JournalVoucherGSTRestoreItemDTO
                {
                    CrAccountId = bbd.DrAccId,
                    TotalTax = totalTax,
                    GstDetail = new GSTDetailDTO
                    {
                        BillBookId = bbd.BillBookId,
                        BillNo = bbd.BillNo,
                        StateId = smd.StateId,
                        StateName = state?.statename,
                        SupplyTypeId = smd.SupplyTypeId,
                        GstinNo = smd.GstINo,
                        ServiceId = gsd.ServiceId,
                        ServiceName = service?.Name,
                        TaxId = gsd.TaxId,
                        TaxName = tax?.Name,
                        TaxLines = taxLineDTOs,
                    }
                });
            }

            return result;
        }

        private async Task<int> ProcessGstEntries(
            GSTDetailDTO gst, decimal baseAmount, decimal netAmount,
            int serviceAccId, int branchId, int voucherId,
            DateTime voucherDate, DateTime valueDate,
            string narration, string voucherStatus, int row)
        {
            var taxForGroup = await _context.tax.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == gst.TaxId && x.BrId == branchId);

            var stockMain = new StockMain
            {
                BrId = branchId,
                Date = voucherDate,
                VmId = voucherId,
                Narration = narration,
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
                DrAccId = serviceAccId,
            });

            await _context.smdetail.AddAsync(new SMDetail
            {
                BrId = branchId,
                StateId = gst.StateId,
                SupplyTypeId = gst.SupplyTypeId,
                StockMainId = stockMain.Id,
                GstINo = gst.GstinNo,
                FkId = serviceAccId,
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
                NetAmount = netAmount,
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
                    long taxHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(taxLine.AccId, branchId);
                    var taxCrEntry = _memberService.voucherCreditDebitDetails(
                        taxHeadCode, taxLine.AccId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), $"GST - {taxLine.TaxTypeName}",
                        taxLine.TaxAmt, voucherStatus, valueDate, "Cr", voucherId, row++);
                    await _context.vouchercreditdebitdetails.AddAsync(taxCrEntry);
                }
            }

            // Update bill number
            var billBook = await _context.billbook.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == gst.BillBookId && x.BrId == branchId);

            if (billBook != null)
            {
                int brsessid = billBook.BillNoGeneration == 1 ? _commonfunctions.GetCurrentSessionId() : 0;
                const int fkType = 1;

                var nextEntry = await _context.nextbillnumber
                    .FirstOrDefaultAsync(x => x.BrId == branchId && x.FkId == gst.BillBookId && x.FkType == fkType && x.BrSessId == brsessid);

                if (nextEntry != null)
                    nextEntry.NextBillNo = gst.BillNo + 1;
                else
                    await _context.nextbillnumber.AddAsync(new NextBillNumber
                    {
                        BrId = branchId,
                        BrSessId = brsessid,
                        FkId = gst.BillBookId,
                        FkType = fkType,
                        NextBillNo = gst.BillNo + 1,
                    });
            }

            return row;
        }
    }
}
