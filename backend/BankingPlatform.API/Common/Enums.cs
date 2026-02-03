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
            FD = 3
        }

        public enum VoucherSubType
        {
            ShareMoney = 1,
            Deposit = 2,
            Withdrawal = 3,
            InterestPosting = 4,
        }

        public enum VoucherStatus
        {
            MemberSM = 1,
            AdmissionFee = 2,
            Dr = 3,
            Cr = 4,
            FDCr = 5,
            FDDr = 6,

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
    }
}
