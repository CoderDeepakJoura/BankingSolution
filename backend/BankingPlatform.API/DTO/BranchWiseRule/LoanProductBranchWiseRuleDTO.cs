namespace BankingPlatform.API.DTO.BranchWiseRule
{
    public class LoanProductBranchWiseRuleDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int LoanProductId { get; set; }
        public int? MCLPlanId { get; set; }
        public int? NPAPlanId { get; set; }
        public int? LegalPlanId { get; set; }
        public string? OperatedBy { get; set; }
        public string? AccNoOrNameFirst { get; set; }
        public int? TempRecAccId { get; set; }
        public int? CurrentRecoverableIntAcc { get; set; }
        public int? IntIncomeAcc { get; set; }
        public int? OverdueRecoverableIntAcc { get; set; }
        public short IsApplyOverInt { get; set; } = 0;
        public int OVRIntProvAcc { get; set; } = 0;
        public int? IntwrtDepositPledge { get; set; }
        public short OVRIntFromOpendate { get; set; } = 0;
        public int? ActOnExpPosting { get; set; }
    }
}
