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
            Saving = 2
        }

        public enum VoucherSubType
        {
            ShareMoney = 1,
            Deposit = 2
        }

        public enum VoucherStatus
        {
            MemberSM = 1,
            AdmissionFee = 2,
            Dr = 3,
            Cr = 4,
        }

        public enum MemberType
        {
            Nominal = 1,
            Permanent = 2
        }
    }
}
