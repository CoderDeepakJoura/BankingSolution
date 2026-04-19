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

        public VoucherRDDetail voucherRDDetails(int branchId, int rdAccId, int rdAccDetId, int vAccCrDrId, int voucherId, double amountCr, double amountDr, string operation, string voucherMainStatus, DateTime voucherDate, DateTime valueDate, decimal? penalAmt = null, int? penalAccId = null, int? othRefAccId = null)
        {
            return new VoucherRDDetail
            {
                BrId = branchId,
                RdAccId = rdAccId,
                RdAccDetId = rdAccDetId,
                VaccCrDrId = vAccCrDrId,
                VoucherId = voucherId,
                AmountCr = amountCr,
                AmountDr = amountDr,
                Operation = operation,
                VoucherMainStatus = voucherMainStatus,
                VoucherDate = voucherDate,
                ValueDate = valueDate,
                PenalAmt = penalAmt,
                PenalAccId = penalAccId,
                OthRefAccId = othRefAccId,
            };
        }
    }
}
