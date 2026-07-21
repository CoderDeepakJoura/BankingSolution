using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.GST;
using BankingPlatform.Infrastructure.Models.voucher;

namespace BankingPlatform.API.Service.Vouchers.Loan
{
    public class LoanExpenseService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly MemberService _memberService;

        public LoanExpenseService(BankingDbContext context, CommonFunctions commonFunctions, MemberService memberService)
        {
            _context = context;
            _commonFunctions = commonFunctions;
            _memberService = memberService;
        }

        public async Task<ServiceLookupDTO> GetServiceByAccountAsync(int accId, int branchId, DateTime date, int supplyTypeId)
        {
            var link = await _context.accservicedetail.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BrId == branchId && x.AccId == accId);

            if (link == null) return new ServiceLookupDTO { HasService = false };

            var service = await _context.service.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == link.ServiceId && x.BrId == branchId);

            if (service == null) return new ServiceLookupDTO { HasService = false };

            DateTime dateOnly = date.Date;
            var taxRule = await _context.servicetaxrule.AsNoTracking()
                .Where(x => x.BrId == branchId && x.ServiceId == link.ServiceId && x.ApplicableDate <= dateOnly)
                .OrderByDescending(x => x.ApplicableDate)
                .FirstOrDefaultAsync();

            if (taxRule == null)
                return new ServiceLookupDTO { HasService = true, ServiceId = service.Id, ServiceName = service.Name };

            var tax = await _context.tax.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == taxRule.TaxId && x.BrId == branchId);

            // Get most-recent taxdetail per TaxTypeId up to the voucher date
            var allTaxDetails = await _context.taxdetail.AsNoTracking()
                .Where(x => x.BrId == branchId && x.TaxId == taxRule.TaxId && x.DetailDate <= dateOnly)
                .OrderByDescending(x => x.DetailDate)
                .ToListAsync();

            var latestPerType = allTaxDetails
                .GroupBy(x => x.TaxTypeId)
                .Select(g => g.First())
                .ToList();

            var taxTypeIds = latestPerType.Select(x => x.TaxTypeId).Distinct().ToList();
            var taxTypes = await _context.taxtype.AsNoTracking()
                .Where(x => taxTypeIds.Contains(x.Id))
                .ToListAsync();

            var filteredTypes = taxTypes.Where(tt =>
                supplyTypeId == 1
                    ? (tt.AppliedIn == 1 || tt.AppliedIn == 3)
                    : (tt.AppliedIn == 2 || tt.AppliedIn == 3)).ToList();

            var taxLines = filteredTypes.Select(tt =>
            {
                var det = latestPerType.FirstOrDefault(d => d.TaxTypeId == tt.Id);
                return new TaxLineDTO
                {
                    TaxTypeId = tt.Id,
                    TaxTypeName = $"{tt.Description}-{tt.Code}",
                    Perc = (decimal)(det?.Percentage ?? 0),
                    AccId = supplyTypeId == 1 ? tt.InAccId : tt.OutAccId,
                };
            }).ToList();

            return new ServiceLookupDTO
            {
                HasService = true,
                ServiceId = service.Id,
                ServiceName = service.Name,
                TaxId = taxRule.TaxId,
                TaxName = tax?.Name,
                TaxLines = taxLines,
            };
        }

        public async Task<List<BillBookDTO>> GetBillBooksAsync(int branchId, int sessionId)
        {
            var billBooks = await _context.billbook.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.Description)
                .ToListAsync();

            var result = new List<BillBookDTO>();
            const int fkType = 1;

            foreach (var bb in billBooks)
            {
                int brsessid = bb.BillNoGeneration == 1 ? sessionId : 0;
                var nextEntry = await _context.nextbillnumber.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.BrId == branchId && x.FkId == bb.Id && x.FkType == fkType && x.BrSessId == brsessid);

                result.Add(new BillBookDTO
                {
                    Id = bb.Id,
                    Name = bb.Description,
                    BillNoGeneration = bb.BillNoGeneration,
                    NextBillNo = nextEntry?.NextBillNo ?? bb.BillNoFrom,
                });
            }

            return result;
        }

        public async Task<(string result, int voucherNo)> CreateAsync(LoanExpenseDTO dto)
        {
            int nextVrNo = 0;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.DrAccountId <= 0 || dto.ExpenseAmount <= 0 || dto.CrAccountId <= 0)
                    return ("Invalid voucher data.", 0);

                if (dto.TotalTax < 0)
                    return ("Total tax cannot be negative.", 0);

                int branchId = dto.BranchId;
                nextVrNo = await _commonFunctions.GetLatestVoucherNo(branchId, dto.Date);
                bool isAutoVerification = await _commonFunctions.IsAutoVerification(branchId);
                string voucherStatus = isAutoVerification ? "V" : "A";
                int currentUserId = int.Parse(_commonFunctions.GetCurrentUserId()!);
                DateTime voucherDate = DateTime.SpecifyKind(dto.Date, DateTimeKind.Unspecified);
                DateTime valueDate = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc);
                string narration = string.IsNullOrWhiteSpace(dto.Remarks)
                    ? $"Loan Expense - {dto.Date:dd-MMM-yyyy}"
                    : dto.Remarks;

                var voucherEntity = new Infrastructure.Models.voucher.Voucher
                {
                    BrID = branchId,
                    VoucherNo = nextVrNo,
                    VoucherType = (int)Enums.VoucherType.Loan,
                    VoucherSubType = (int)Enums.VoucherSubType.LoanExpense,
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

                // Dr — loan account (netamount)
                long loanHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(dto.DrAccountId, branchId);
                var drEntry = _memberService.voucherCreditDebitDetails(
                    loanHeadCode, dto.DrAccountId, branchId,
                    Enums.VoucherStatus.LA.ToString(), narration,
                    dto.NetAmount, voucherStatus, valueDate, "Dr", voucherId, row++);
                await _context.vouchercreditdebitdetails.AddAsync(drEntry);

                // Cr — credit account (expenseAmount)
                long crHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(dto.CrAccountId, branchId);
                var crEntry = _memberService.voucherCreditDebitDetails(
                    crHeadCode, dto.CrAccountId, branchId,
                    Enums.VoucherStatus.Cr.ToString(), narration,
                    dto.ExpenseAmount, voucherStatus, valueDate, "Cr", voucherId, row++);
                await _context.vouchercreditdebitdetails.AddAsync(crEntry);

                int? stockMainId = null;

                if (dto.GstDetail != null && dto.GstDetail.TaxLines.Count > 0)
                {
                    var gst = dto.GstDetail;

                    var taxForGroup = await _context.tax.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == gst.TaxId && x.BrId == branchId);

                    var stockMain = new StockMain
                    {
                        BrId = branchId,
                        Date = voucherDate,
                        VmId = null,
                        Narration = narration,
                        TaxGroupId = taxForGroup?.TaxGroupId ?? 0,
                        IsRC = 0,
                        TotalAmount = dto.ExpenseAmount,
                        RoundAmount = null,
                        TransTypeId = null,
                    };
                    await _context.stockmain.AddAsync(stockMain);
                    await _context.SaveChangesAsync();
                    stockMainId = stockMain.Id;

                    await _context.stockbillbookdetail.AddAsync(new StockBillBookDetail
                    {
                        BrId = branchId,
                        StockMainId = stockMain.Id,
                        BillBookId = gst.BillBookId,
                        BillNo = gst.BillNo,
                        Date = voucherDate,
                        DrAccId = dto.DrAccountId,
                    });

                    await _context.smdetail.AddAsync(new SMDetail
                    {
                        BrId = branchId,
                        StateId = gst.StateId,
                        SupplyTypeId = gst.SupplyTypeId,
                        StockMainId = stockMain.Id,
                        GstINo = gst.GstinNo,
                        FkId = dto.DrAccountId,
                        FkBrId = branchId,
                        FkTypeId = 1,
                    });

                    await _context.gstservicedetail.AddAsync(new GSTServiceDetail
                    {
                        BrId = branchId,
                        StockMainId = stockMain.Id,
                        ServiceId = gst.ServiceId,
                        TaxId = gst.TaxId,
                        Amount = dto.ExpenseAmount,
                        NetAmount = dto.NetAmount,
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

                    // Update bill number
                    var billBook = await _context.billbook.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == gst.BillBookId && x.BrId == branchId);

                    if (billBook != null)
                    {
                        int brsessid = billBook.BillNoGeneration == 1 ? _commonFunctions.GetCurrentSessionId() : 0;
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
                }

                await _context.loanexpense.AddAsync(new LoanExpense
                {
                    BrId = branchId,
                    Date = voucherDate,
                    LoanProductId = dto.LoanProductId,
                    DrAccountId = dto.DrAccountId,
                    ExpenseCategoryId = dto.ExpenseCategoryId,
                    ExpenseAmount = dto.ExpenseAmount,
                    TotalTax = dto.TotalTax,
                    NetAmount = dto.NetAmount,
                    Remarks = dto.Remarks,
                    CrAccountTypeId = dto.CrAccountTypeId,
                    CrAccountId = dto.CrAccountId,
                    StockMainId = stockMainId,
                    VoucherId = voucherId,
                    VoucherNo = nextVrNo,
                    AddedBy = currentUserId,
                });
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "An error occurred while saving the loan expense.", 0);
            }

            return ("Success", nextVrNo);
        }

        public async Task<LoanExpenseDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.loanexpense.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return null;

            return new LoanExpenseDTO
            {
                Id = entity.Id,
                BranchId = entity.BrId,
                Date = entity.Date,
                LoanProductId = entity.LoanProductId,
                DrAccountId = entity.DrAccountId,
                ExpenseCategoryId = entity.ExpenseCategoryId,
                ExpenseAmount = entity.ExpenseAmount,
                TotalTax = entity.TotalTax,
                NetAmount = entity.NetAmount,
                Remarks = entity.Remarks,
                CrAccountTypeId = entity.CrAccountTypeId,
                CrAccountId = entity.CrAccountId,
            };
        }

        public async Task<(string result, int voucherNo)> UpdateAsync(int id, LoanExpenseDTO dto)
        {
            var deleted = await DeleteAsync(id, dto.BranchId);
            if (!deleted) return ("Record not found.", 0);
            return await CreateAsync(dto);
        }

        public async Task<(List<LoanExpenseListDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter, DateTime? date = null)
        {
            var query = _context.loanexpense.AsNoTracking().Where(x => x.BrId == branchId);

            if (date.HasValue)
            {
                var d = date.Value.Date;
                query = query.Where(x => x.Date == d);
            }

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x => x.Remarks != null && x.Remarks.ToLower().Contains(term));
            }

            var total = await query.CountAsync();
            var items = await query.OrderByDescending(x => x.Date).ThenByDescending(x => x.Id)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            if (!items.Any()) return (new List<LoanExpenseListDTO>(), total);

            var loanProdIds = items.Select(x => x.LoanProductId).Distinct().ToList();
            var accIds = items.Select(x => x.DrAccountId).Distinct().ToList();
            var expCatIds = items.Select(x => x.ExpenseCategoryId).Distinct().ToList();

            var loanProducts = await _context.loanproduct.AsNoTracking()
                .Where(x => loanProdIds.Contains(x.Id))
                .Select(x => new { x.Id, x.ProductName })
                .ToListAsync();

            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => accIds.Contains(x.ID))
                .Select(x => new { x.ID, x.AccountNumber, x.AccountName })
                .ToListAsync();

            var expCats = await _context.expensecategory.AsNoTracking()
                .Where(x => expCatIds.Contains(x.Id))
                .Select(x => new { x.Id, x.Description })
                .ToListAsync();

            var loanProdMap = loanProducts.ToDictionary(x => x.Id, x => x.ProductName ?? "");
            var accMap = accounts.ToDictionary(x => x.ID, x => $"{x.AccountNumber}-{x.AccountName}".Trim('-').Trim());
            var expCatMap = expCats.ToDictionary(x => x.Id, x => x.Description ?? "");

            return (items.Select(x => new LoanExpenseListDTO
            {
                Id = x.Id,
                Date = x.Date.ToString("d-MMMM-yyyy"),
                LoanProductName = loanProdMap.TryGetValue(x.LoanProductId, out var lp) ? lp : null,
                AccountName = accMap.TryGetValue(x.DrAccountId, out var acc) ? acc : null,
                ExpenseCategoryName = expCatMap.TryGetValue(x.ExpenseCategoryId, out var ec) ? ec : null,
                ExpenseAmount = x.ExpenseAmount,
                TotalTax = x.TotalTax,
                NetAmount = x.NetAmount,
                Remarks = x.Remarks,
                VoucherNo = x.VoucherNo,
            }).ToList(), total);
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.loanexpense
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);

            if (entity == null) return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (entity.StockMainId.HasValue)
                {
                    int smId = entity.StockMainId.Value;

                    var taxDetails = await _context.stocktaxdetail.Where(x => x.StockMainId == smId).ToListAsync();
                    if (taxDetails.Any()) _context.stocktaxdetail.RemoveRange(taxDetails);

                    var serviceDetails = await _context.gstservicedetail.Where(x => x.StockMainId == smId).ToListAsync();
                    if (serviceDetails.Any()) _context.gstservicedetail.RemoveRange(serviceDetails);

                    var smDetails = await _context.smdetail.Where(x => x.StockMainId == smId).ToListAsync();
                    if (smDetails.Any()) _context.smdetail.RemoveRange(smDetails);

                    var billBookDetails = await _context.stockbillbookdetail.Where(x => x.StockMainId == smId).ToListAsync();
                    if (billBookDetails.Any()) _context.stockbillbookdetail.RemoveRange(billBookDetails);

                    var stockMain = await _context.stockmain.FirstOrDefaultAsync(x => x.Id == smId);
                    if (stockMain != null) _context.stockmain.Remove(stockMain);
                }

                if (entity.VoucherId.HasValue)
                {
                    // vouchercreditdebitdetails is deleted automatically via ON DELETE CASCADE on the FK to voucher
                    var voucher = await _context.voucher.FirstOrDefaultAsync(x => x.Id == entity.VoucherId.Value);
                    if (voucher != null) _context.voucher.Remove(voucher);
                }

                _context.loanexpense.Remove(entity);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<(string GstNo, int StateId)> GetBranchGstInfoAsync(int branchId)
        {
            var info = await _context.branchmaster.AsNoTracking()
                .Where(x => x.id == branchId)
                .Select(x => new { x.branchmaster_gstino, x.branchmaster_stateid })
                .FirstOrDefaultAsync();
            return (info?.branchmaster_gstino ?? "", info?.branchmaster_stateid ?? 0);
        }
    }
}
