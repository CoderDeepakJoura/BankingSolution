namespace BankingPlatform.API.DTO.Agent
{
    // Returned to mobile app for each account type
    public class AgentRDAccountDTO
    {
        public int AccountId { get; set; }
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public decimal Balance { get; set; }
        public decimal KistAmount { get; set; }
        public string MobileNumber { get; set; } = "";
        public bool CollectedToday { get; set; }
        public decimal? CollectedAmount { get; set; }
    }

    public class AgentSavingAccountDTO
    {
        public int AccountId { get; set; }
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public decimal Balance { get; set; }
        public string MobileNumber { get; set; } = "";
        public bool CollectedToday { get; set; }
        public decimal? CollectedAmount { get; set; }
    }

    public class AgentLoanAccountDTO
    {
        public int AccountId { get; set; }
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public string LoanType { get; set; } = "";  // "stand" | "addInBalance"
        public decimal OutstandingBalance { get; set; }
        public decimal PrincipalDue { get; set; }
        public decimal InterestDue { get; set; }
        public string MobileNumber { get; set; } = "";
        public bool CollectedToday { get; set; }
        public decimal? CollectedAmount { get; set; }
    }

    // Posted by mobile app when agent collects
    public class PostAgentCollectionDTO
    {
        public int BranchId { get; set; }
        public int AgentId { get; set; }
        public int AccountId { get; set; }
        public string AccType { get; set; } = "";  // "RD" | "Saving" | "Loan"
        public decimal Amount { get; set; }
        public string? Notes { get; set; }
    }

    public class AgentCollectionResponseDTO
    {
        public int CollectionId { get; set; }
        public string ReceiptNo { get; set; } = "";
        public decimal Amount { get; set; }
        public DateTime CollectionDate { get; set; }
    }

    // For super agent admin — collection summary
    public class AgentCollectionSummaryDTO
    {
        public int AgentId { get; set; }
        public string AgentName { get; set; } = "";
        public string AgentCode { get; set; } = "";
        public int RdCount { get; set; }
        public decimal RdTotal { get; set; }
        public int SavingCount { get; set; }
        public decimal SavingTotal { get; set; }
        public int LoanCount { get; set; }
        public decimal LoanTotal { get; set; }
        public int TotalCount { get; set; }
        public decimal GrandTotal { get; set; }
    }
}
