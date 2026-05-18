namespace BankingPlatform.API.Common
{
    public class Enums
    {
        public enum DayStatus
        {
            Begin = 1,
            End = 2
        }
        public enum AccountTypes
        {
            Loan = 1,
            Saving = 2,
            General = 3,
            ShareMoney = 4,
            RD = 5,
            FD = 6,
            BankFD = 7
        }
        public enum VoucherType
        {
            Member = 1,
            Saving = 2,
            FD = 3,
            RD = 4,
            Loan = 5,
            Cash = 6,
            Journal = 7,
            OdReserve = 8,
        }

        public enum VoucherSubType
        {
            ShareMoney = 1,
            Deposit = 2,
            Withdrawal = 3,
            InterestPosting = 4,
            Mature = 5,
            Renew = 6,
            PreMature = 7,
            Kist = 8,
            LoanAdvancement = 9,
            LoanRecovery = 10,
            PaymentReceipt = 11,
            Transfer = 12,
            OdReservePosting = 13,
        }

        public enum VoucherStatus
        {
            MemberSM = 1,
            AdmissionFee = 2,
            Dr = 3,
            Cr = 4,
            FDCr = 5,
            FDDr = 6,
            LA = 7,
            LR = 8,
            RDCr = 9,
            RDDr = 10,
        }

        public enum IntCategory
        {
            StdInterest = 1,
            PenalInterest = 2,
            StdRecoverable = 3,
            OverdueRecoverable = 4,
        }

        public enum MemberType
        {
            Nominal = 1,
            Permanent = 2
        }

        public enum AccountTypeOfFDProduct
        {
            SameAccount = 1,
            OtherAccount = 2
        }
        public enum CompoundingInterval
        {
            NoCompounding = 1,
            Daily = 2,
            Monthly = 3,
            Quarterly = 4, 
            Half_Yearly = 5,
            Yearly = 6,
            Two_Yearly = 7
        }

        public enum FDStatus
        {
            Open = 1,
            Matured = 2,
            Pre_Matured = 3,
            Renewed = 4,
        }
    }
}
