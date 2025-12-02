using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.Saving;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.Identity.Client;

namespace BankingPlatform.API.Service.Vouchers.Saving
{
    public class SavingVoucherService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly VoucherMapper _voucherMapper;

        public SavingVoucherService(BankingDbContext context, CommonFunctions commonFunctions, MemberService memberService, VoucherMapper voucherMapper)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _memberService = memberService;
            _voucherMapper = voucherMapper;
        }
        [HttpPost]
        public async Task<(string result, int voucherNo)> AddSavingVoucher(SavingVoucherDTO dto)
        {
            int nextVrNo = 0;

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                if (dto.Voucher!.DebitAccountId > 0 && dto.Voucher!.DebitAccountId > 0 && dto.Voucher.TotalDebit > 0)
                {
                    int branchId = dto.Voucher.BrID;
                    int debitAccountId = (int)dto.Voucher!.DebitAccountId;
                    int creditAccountId = (int)dto.Voucher!.CreditAccountId!;
                    decimal totalDebit = (decimal)dto.Voucher.TotalDebit;
                    nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId);
                    bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                    string narration = dto.Voucher.VoucherNarration ?? "";
                    DateTime voucherDate = DateTime.SpecifyKind(dto.Voucher.VoucherDate, DateTimeKind.Unspecified);
                    dto.Voucher = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified),

                        // Other non-DateTime fields
                        AddedBy = Int32.Parse(_commonfunctions.GetCurrentUserId()!),
                        BrID = branchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? Int32.Parse(_commonfunctions.GetCurrentUserId()!) : 0,
                        VoucherNarration = narration,
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = isAutoVerification ? "V" : "A",
                        VoucherType = (int)Enums.VoucherType.Saving,
                        VoucherSubType = dto.VoucherSubType == "D" ? (int)Enums.VoucherSubType.Deposit : (int)Enums.VoucherSubType.Withdrawal,
                    };

                    var voucherInfo = _memberService.MapToEntity(dto.Voucher!);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();
                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    int row = 1;
                    VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(creditAccountId, branchId), creditAccountId, branchId, Enums.VoucherStatus.Cr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);

                    await _context.vouchercreditdebitdetails.AddAsync(voucherCreditInfo);
                    row++;

                    VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(debitAccountId, branchId), (int)debitAccountId, branchId, Enums.VoucherStatus.Dr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(voucherDebitInfo);
                    await _context.SaveChangesAsync();

                    string operation = dto.VoucherSubType == "D" ? "SD" : "SW";
                    int savingAccountId = dto.VoucherSubType == "D" ? creditAccountId : debitAccountId;
                    int vAccCrDrId = dto.VoucherSubType == "D" ? voucherCreditInfo.Id : voucherDebitInfo.Id;
                    VoucherSavingDetail voucherSavingDetail = _voucherMapper.voucherSavingDetails(branchId, savingAccountId, 0, vAccCrDrId, voucherInfo.Id, dto.Voucher.VoucherNarration, totalDebit, dto.Voucher.VoucherStatus, voucherDate, valueDate, operation, 0);
                    await _context.vouchersavingdetail.AddAsync(voucherSavingDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (ex.Message ?? "Some error occured while saving entry.", 0);
            }

            return ("Success", nextVrNo);
        }

        public async Task<string> UpdateSavingVoucher(SavingVoucherDTO dto)
        {

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                if (dto.Voucher!.Id > 0 && dto.Voucher!.BrID > 0)
                {
                    var existingVoucherInfo = await _context.voucher.FirstOrDefaultAsync(x => x.Id == dto.Voucher!.Id && x.BrID == dto.Voucher!.BrID);
                    if (existingVoucherInfo == null) return "Voucher not found.";

                    int branchId = dto.Voucher.BrID;
                    int debitAccountId = (int)dto.Voucher.DebitAccountId!;
                    int creditAccountId = (int)dto.Voucher!.CreditAccountId!;
                    decimal totalDebit = (decimal)dto.Voucher.TotalDebit!;
                    int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId);
                    bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                    string narration = dto.Voucher.VoucherNarration ?? "";
                    int row = 1;
                    VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(debitAccountId, branchId), creditAccountId, branchId, Enums.VoucherStatus.Cr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, existingVoucherInfo.VoucherDate, "Cr", existingVoucherInfo.Id, row);

                    await _context.vouchercreditdebitdetails.AddAsync(voucherCreditInfo);
                    row++;

                    VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(debitAccountId, branchId), (int)debitAccountId, branchId, Enums.VoucherStatus.Dr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, existingVoucherInfo.VoucherDate, "Dr", existingVoucherInfo.Id, row);
                    await _context.vouchercreditdebitdetails.AddAsync(voucherDebitInfo);
                    await _context.SaveChangesAsync();

                    string operation = dto.VoucherSubType == "D" ? "SD" : "SW";
                    int savingAccountId = dto.VoucherSubType == "D" ? creditAccountId : debitAccountId;
                    int vAccCrDrId = dto.VoucherSubType == "D" ? voucherCreditInfo.Id : voucherDebitInfo.Id;
                    VoucherSavingDetail voucherSavingDetail = _voucherMapper.voucherSavingDetails(branchId, savingAccountId, 0, vAccCrDrId, existingVoucherInfo.Id, dto.Voucher.VoucherNarration, totalDebit, dto.Voucher.VoucherStatus, existingVoucherInfo.VoucherDate, existingVoucherInfo.VoucherDate, operation, 0);
                    await _context.vouchersavingdetail.AddAsync(voucherSavingDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return "Error";
            }

            return "Success";
        }
    }
}
