using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterBranch;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.GST;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterBranch
{
    /// <summary>
    /// IB Loan Expense — same direction as IB Loan Advancement:
    ///   Cash is collected at source/HO; loan account is at dest branch.
    ///   Step 1 (source): Dr=IB-Ref, Cr=CrAcc (+ optional GST entries at source)
    ///   Step 2 (HO, BranchToBranch): Dr=Dest-Ref, Cr=Source-Ref
    ///   Step 3 (dest): Dr=LoanAccount(LA), Cr=HO-Ref + writes loanexpense record
    /// </summary>
    public class IBLoanExpenseService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;

        public IBLoanExpenseService(
            BankingDbContext context,
            CommonFunctions commonfunctions,
            MemberService memberService)
        {
            _context = context;
            _commonfunctions = commonfunctions;
            _memberService = memberService;
        }

        // ── Step 1 — originating branch (HO or non-HO) ──────────────────────────
        public async Task<(bool success, string message, int ibVoucherId)> CreateStep1Async(IBLoanExpenseStep1DTO dto)
        {
            if (dto.Amount <= 0 || dto.ExpenseAmount <= 0)
                return (false, "Amount must be greater than zero.", 0);
            if (dto.TotalTax < 0)
                return (false, "Total tax cannot be negative.", 0);
            if (dto.DestBrId == dto.BrId)
                return (false, "Destination branch cannot be the same as originating branch.", 0);
            if (dto.LoanProductId <= 0)
                return (false, "Loan product is required.", 0);
            if (dto.ExpenseCategoryId <= 0)
                return (false, "Expense category is required.", 0);

            // Validate IB-ref account
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
                return (false, "Credit account not found at originating branch.", 0);

            string flowType = dto.FlowType == "HOToBranch" ? "HOToBranch" : "BranchToBranch";
            int subType = flowType == "HOToBranch"
                ? (int)Enums.VoucherSubType.IBHOLoanExpStep1
                : (int)Enums.VoucherSubType.IBBrLoanExpStep1;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int branchId = dto.BrId;
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valueDate   = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narration = !string.IsNullOrWhiteSpace(dto.Narration)
                    ? dto.Narration
                    : !string.IsNullOrWhiteSpace(dto.Remarks)
                        ? dto.Remarks
                        : $"IB Loan Expense for A/c {dto.DestAccNo} ({dto.DestAccName})";
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
                // Dr = IB-Ref (NetAmount)
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(
                        drHeadCode, dto.DrAccId, branchId,
                        Enums.VoucherStatus.Dr.ToString(), narration,
                        dto.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
                row++;
                // Cr = CrAcc (ExpenseAmount — base before tax)
                await _context.vouchercreditdebitdetails.AddAsync(
                    _memberService.voucherCreditDebitDetails(
                        crHeadCode, dto.CrAccId, branchId,
                        Enums.VoucherStatus.Cr.ToString(), narration,
                        dto.ExpenseAmount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));

                int? stockMainId = null;

                if (dto.GstDetail != null && dto.GstDetail.TaxLines?.Count > 0)
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
                        DrAccId = dto.DrAccId,
                    });

                    await _context.smdetail.AddAsync(new SMDetail
                    {
                        BrId = branchId,
                        StateId = gst.StateId,
                        SupplyTypeId = gst.SupplyTypeId,
                        StockMainId = stockMain.Id,
                        GstINo = gst.GstinNo,
                        FkId = dto.DrAccId,
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
                        NetAmount = dto.Amount,
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
                            row++;
                            long taxHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(taxLine.AccId, branchId);
                            await _context.vouchercreditdebitdetails.AddAsync(
                                _memberService.voucherCreditDebitDetails(
                                    taxHeadCode, taxLine.AccId, branchId,
                                    Enums.VoucherStatus.Cr.ToString(), $"GST - {taxLine.TaxTypeName}",
                                    taxLine.TaxAmt, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
                        }
                    }

                    await _context.SaveChangesAsync();

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
                                BrId = branchId, BrSessId = brsessid,
                                FkId = gst.BillBookId, FkType = fkType,
                                NextBillNo = gst.BillNo + 1,
                            });
                    }
                }

                await _context.SaveChangesAsync();

                DateTime.TryParse(dto.WorkingDate, out DateTime parsedWorkingDate);

                var ibRecord = new InterBranchVoucher
                {
                    VoucherType  = "IBLoanExpense",
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

                // Store expense metadata for use at the final step
                await _context.ibvoucherexpensedetail.AddAsync(new IBVoucherExpenseDetail
                {
                    IBVoucherId      = ibRecord.Id,
                    LoanProductId    = dto.LoanProductId,
                    ExpenseCategoryId = dto.ExpenseCategoryId,
                    ExpenseAmount    = dto.ExpenseAmount,
                    TotalTax         = dto.TotalTax,
                    NetAmount        = dto.Amount,
                    Remarks          = dto.Remarks,
                    CrAccountTypeId  = dto.CrAccountTypeId,
                });
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return (true, "IB loan expense voucher recorded successfully.", ibRecord.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while saving the IB loan expense voucher.", 0);
            }
        }

        // ── Step 2 — HO settles (BranchToBranch only) ────────────────────────────
        // Dr=Dest-Ref, Cr=Source-Ref (same direction as loan advancement)
        public async Task<(bool success, string message)> CreateHOSettlementAsync(int ibVoucherId, IBSavingDepositStep2DTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ibRecord = await _context.interbranchvoucher
                    .FromSqlInterpolated($"SELECT * FROM interbranchvoucher WHERE id = {ibVoucherId} FOR UPDATE")
                    .FirstOrDefaultAsync();
                if (ibRecord == null) return (false, "Inter-branch voucher not found.");
                if (ibRecord.VoucherType != "IBLoanExpense") return (false, "Voucher is not an IB Loan Expense.");
                if (ibRecord.Step2VoucherId.HasValue) return (false, "HO has already settled this voucher.");

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
                    : ibRecord.Narration ?? $"IB Loan Expense Settlement — Br{ibRecord.FromBrId} → Br{ibRecord.DestBrId}";
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
                    VoucherSubType   = (int)Enums.VoucherSubType.IBBrLoanExpStep2,
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
                return (false, ex.Message ?? "An error occurred during HO loan expense settlement.");
            }
        }

        // ── Final step — dest branch books the loan expense ───────────────────────
        // Dr=LoanAccount(LA), Cr=HO-Ref + writes loanexpense record
        public async Task<(bool success, string message)> DispatchFinalStepAsync(int ibVoucherId, IBLoanExpenseFinalStepDTO dto)
        {
            var ibRecord = await _context.interbranchvoucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == ibVoucherId);
            if (ibRecord == null) return (false, "Inter-branch voucher not found.");
            if (ibRecord.VoucherType != "IBLoanExpense") return (false, "Voucher is not an IB Loan Expense.");

            return ibRecord.FlowType == "HOToBranch"
                ? await CreateHOFinalStepAsync(ibVoucherId, dto)
                : await CreateBranchFinalStepAsync(ibVoucherId, dto);
        }

        private async Task<(bool success, string message)> CreateHOFinalStepAsync(int ibVoucherId, IBLoanExpenseFinalStepDTO dto)
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

                return await WriteExpenseFinalVoucherAsync(ibRecord, destBrId,
                    ibRecord.DestAccId, drAcc.AccountName,
                    crMapping.AccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBHOLoanExpStep2,
                    dto.WorkingDate, dto.UserId, transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB loan expense.");
            }
        }

        private async Task<(bool success, string message)> CreateBranchFinalStepAsync(int ibVoucherId, IBLoanExpenseFinalStepDTO dto)
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

                return await WriteExpenseFinalVoucherAsync(ibRecord, destBrId,
                    ibRecord.DestAccId, drAcc.AccountName,
                    crMapping.AccId, crAcc.AccountName,
                    (int)Enums.VoucherSubType.IBBrLoanExpStep3,
                    dto.WorkingDate, dto.UserId, transaction, dto.Narration);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while completing the IB loan expense.");
            }
        }

        // Dr=LoanAccount(LA), Cr=HO-Ref + writes loanexpense record at dest branch
        private async Task<(bool success, string message)> WriteExpenseFinalVoucherAsync(
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
                : ibRecord.Narration ?? $"IB Loan Expense — charged to {ibRecord.DestAccName}";
            string userId = userIdRaw ?? _commonfunctions.GetCurrentUserId() ?? "0";

            using var _vrLease = await _commonfunctions.ReserveVoucherNoAsync(branchId, voucherDate);
            int nextVrNo = _vrLease.VoucherNo;
            bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
            string voucherStatus = isAutoVerification ? "V" : "A";

            // Load expense metadata stored at Step 1
            var expDetail = await _context.ibvoucherexpensedetail
                .FirstOrDefaultAsync(x => x.IBVoucherId == ibRecord.Id);
            if (expDetail == null)
                return (false, "Expense detail metadata not found for this IB voucher.");

            var voucherEntity = new Voucher
            {
                BrID             = branchId,
                VoucherNo        = nextVrNo,
                VoucherType      = (int)Enums.VoucherType.Loan,
                VoucherSubType   = (int)Enums.VoucherSubType.LoanExpense,
                VoucherDate      = voucherDate,
                ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                VoucherNarration = narration,
                VoucherStatus    = voucherStatus,
                AddedBy          = int.Parse(userId),
                ModifiedBy       = 0,
                VerifiedBy       = isAutoVerification ? int.Parse(userId) : 0,
                OtherBrID        = 0,
            };
            await _context.voucher.AddAsync(voucherEntity);
            await _context.SaveChangesAsync();

            long drHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(drAccId, branchId);
            long crHeadCode = await _commonfunctions.GetAccountHeadCodeFromAccId(crAccId, branchId);

            int row = 1;
            // Dr = Loan account (NetAmount, EntryStatus=LA)
            await _context.vouchercreditdebitdetails.AddAsync(
                _memberService.voucherCreditDebitDetails(
                    drHeadCode, drAccId, branchId,
                    Enums.VoucherStatus.LA.ToString(), narration,
                    ibRecord.Amount, voucherStatus, valueDate, "Dr", voucherEntity.Id, row));
            row++;
            // Cr = HO-Ref (NetAmount)
            await _context.vouchercreditdebitdetails.AddAsync(
                _memberService.voucherCreditDebitDetails(
                    crHeadCode, crAccId, branchId,
                    Enums.VoucherStatus.Cr.ToString(), narration,
                    ibRecord.Amount, voucherStatus, valueDate, "Cr", voucherEntity.Id, row));
            await _context.SaveChangesAsync();

            // Write loanexpense record at dest branch
            await _context.loanexpense.AddAsync(new LoanExpense
            {
                BrId              = branchId,
                Date              = voucherDate,
                LoanProductId     = expDetail.LoanProductId,
                DrAccountId       = drAccId,
                ExpenseCategoryId = expDetail.ExpenseCategoryId,
                ExpenseAmount     = expDetail.ExpenseAmount,
                TotalTax          = expDetail.TotalTax,
                NetAmount         = expDetail.NetAmount,
                Remarks           = expDetail.Remarks,
                CrAccountTypeId   = 3, // General — HO-Ref account is a General account
                CrAccountId       = crAccId,
                StockMainId       = null, // GST was handled at source branch
                VoucherId         = voucherEntity.Id,
                VoucherNo         = nextVrNo,
                AddedBy           = int.Parse(userId),
            });
            await _context.SaveChangesAsync();

            // Update IB record — also update interbranchvoucher with the Step 2 or 3 subtype voucher
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
            return (true, "IB loan expense completed. Loan account charged successfully.");
        }

        // ── Queries ───────────────────────────────────────────────────────────────

        public async Task<List<IBVoucherListDTO>> GetPendingForHOAsync(int hoBrId)
        {
            var list = await _context.interbranchvoucher
                .Where(x => x.VoucherType == "IBLoanExpense"
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

            // Pre-resolve Step 2 account names (Dr=Dest-Ref, Cr=Source-Ref)
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
                    var drMap = mappings.FirstOrDefault(m => m.OtherBrId == dto.DestBrId);
                    var crMap = mappings.FirstOrDefault(m => m.OtherBrId == dto.FromBrId);
                    if (drMap != null && accNames.TryGetValue(drMap.AccId, out var drName))
                        dto.Step2DrAccName = drName;
                    if (crMap != null && accNames.TryGetValue(crMap.AccId, out var crName))
                        dto.Step2CrAccName = crName;
                }
            }

            // Enrich with expense detail
            await EnrichWithExpenseDetailAsync(list);
            return list;
        }

        public async Task<List<IBVoucherListDTO>> GetIncomingForBranchAsync(int brId)
        {
            var raw = await _context.interbranchvoucher
                .Where(x => x.VoucherType == "IBLoanExpense"
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
                    if (r.Dto.Step3CrAccName != null) continue;
                    int hoBrId = r.Dto.FlowType == "HOToBranch"
                        ? r.Dto.FromBrId
                        : (r.Step2BrId ?? fallbackHoBrId ?? 0);
                    if (hoBrId == 0) continue;
                    var mapping = mappings.FirstOrDefault(m => m.OtherBrId == hoBrId);
                    if (mapping != null && accNames.TryGetValue(mapping.AccId, out var name))
                        r.Dto.Step3CrAccName = name;
                }
            }

            var dtos = raw.Select(r => r.Dto).ToList();
            await EnrichWithExpenseDetailAsync(dtos);
            return dtos;
        }

        private async Task EnrichWithExpenseDetailAsync(List<IBVoucherListDTO> list)
        {
            if (!list.Any()) return;
            var ids = list.Select(d => d.Id).ToList();
            var expDetails = await _context.ibvoucherexpensedetail
                .Where(x => ids.Contains(x.IBVoucherId))
                .ToListAsync();

            if (!expDetails.Any()) return;

            var prodIds = expDetails.Select(x => x.LoanProductId).Distinct().ToList();
            var catIds  = expDetails.Select(x => x.ExpenseCategoryId).Distinct().ToList();

            var products = await _context.loanproduct.AsNoTracking()
                .Where(x => prodIds.Contains(x.Id))
                .Select(x => new { x.Id, x.ProductName })
                .ToDictionaryAsync(x => x.Id, x => x.ProductName ?? "");

            var categories = await _context.expensecategory.AsNoTracking()
                .Where(x => catIds.Contains(x.Id))
                .Select(x => new { x.Id, x.Description })
                .ToDictionaryAsync(x => x.Id, x => x.Description ?? "");

            var expMap = expDetails.ToDictionary(x => x.IBVoucherId);

            foreach (var dto in list)
            {
                if (!expMap.TryGetValue(dto.Id, out var exp)) continue;
                dto.ExpenseLoanProductId   = exp.LoanProductId;
                dto.ExpenseLoanProductName = products.TryGetValue(exp.LoanProductId, out var pn) ? pn : null;
                dto.ExpenseCategoryId      = exp.ExpenseCategoryId;
                dto.ExpenseCategoryName    = categories.TryGetValue(exp.ExpenseCategoryId, out var cn) ? cn : null;
                dto.ExpenseAmount          = exp.ExpenseAmount;
                dto.ExpenseTotalTax        = exp.TotalTax;
                dto.ExpenseNetAmount       = exp.NetAmount;
                dto.ExpenseRemarks         = exp.Remarks;
                dto.ExpenseCrAccountTypeId = exp.CrAccountTypeId;
            }
        }
    }
}
