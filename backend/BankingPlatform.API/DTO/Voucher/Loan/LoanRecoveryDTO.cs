namespace BankingPlatform.API.DTO.Voucher.Loan
{
    public class LoanRecoveryDebitItemDTO
    {
        public int AccountId { get; set; }
        public int AccountType { get; set; }
        public decimal Amount { get; set; }
        public string? Narration { get; set; }
    }

    public class LoanRecoveryVoucherDTO
    {
        public int BrId { get; set; }
        public int LoanAccountId { get; set; }
        public DateTime VoucherDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Narration { get; set; }
        public string? Agent { get; set; }
        public List<LoanRecoveryDebitItemDTO> DebitItems { get; set; } = new();
    }

    public class LoanRecoveryBalanceDTO
    {
        public int LoanAccId { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string MemberName { get; set; } = string.Empty;
        public string? MemberRelativeName { get; set; }
        public string? PhoneNo { get; set; }
        public string? MembershipNo { get; set; }
        public string? BranchName { get; set; }
        public string? LoanNo { get; set; }
        public DateTime? LoanDate { get; set; }
        public double? StandardInterestRate { get; set; }
        public double? OverdueInterestRate { get; set; }
        public decimal? KistAmount { get; set; }
        public decimal PrincipalBalance { get; set; }
        public decimal StdInterestOutstanding { get; set; }
        public decimal PenalInterestOutstanding { get; set; }
        public decimal StdRecoverableOutstanding { get; set; }
        public decimal OverdueRecoverableOutstanding { get; set; }
        public decimal TotalOutstanding { get; set; }
        public string RecoverySeq { get; set; } = "4,3,2,1";
        public decimal SavingBalance { get; set; }

        // Overdue installment breakdown
        public int OverdueInstallments { get; set; }
        public decimal OverduePrincipal { get; set; }

        // Interest calculation period (shown in UI)
        public DateTime? InterestCalcFromDate { get; set; }
        public DateTime? InterestCalcToDate { get; set; }

        // 'Schedule' | 'Balance' | 'MinBalance'
        public string IntCalcMethod { get; set; } = "Schedule";
    }

    public class LoanAccountSearchDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public int? MemberId { get; set; }
    }

    public class KistScheduleDTO
    {
        public int KistNumber { get; set; }
        public DateTime? Date { get; set; }
        public decimal KistAmount { get; set; }
        public decimal PrincipalAmt { get; set; }
        public decimal InterestAmt { get; set; }
    }
}
