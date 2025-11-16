using BankingPlatform.Infrastructure.Models.voucher;

namespace BankingPlatform.API.Mappers.Voucher
{
    public class VoucherMapper
    {
        public VoucherSavingDetail voucherSavingDetails(int branchId, int accId, int chequeBookId, int vAccCrDrId, int voucherId, string narration, decimal voucherAmount, string voucherMainStatus, DateTime voucherDate, DateTime valueDate, string operation, int chequeNo)
        {
            return new VoucherSavingDetail
            {
                AccId = accId,
                Amt = voucherAmount,
                BrId = branchId,
                ChequeBookId = chequeBookId,
                ChequeNo = chequeNo,
                Operation = operation,
                VAccCrDrId = vAccCrDrId,
                VoucherDate = voucherDate,
                ValueDate = valueDate,
                VoucherMainStatus = voucherMainStatus,
                VoucherId = voucherId
            };
        }
    }
}
