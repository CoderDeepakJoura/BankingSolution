namespace BankingPlatform.API.DTO.BranchWiseRule
{
    public class RDProductBranchWiseRuleDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int RDProductId { get; set; }
        public int IntFormula { get; set; }
        public string? AccNoGeneration { get; set; }
        public bool PrintCertificate { get; set; }
        public bool KistAfterMaturity { get; set; }
        public short? PaymentDateType { get; set; }
        public int? NoOfDayOrMonth { get; set; }
        public int? IntExpAccId { get; set; }
        public int? PenaltyIncAccId { get; set; }
        public int? ClosingChargesAcc { get; set; }
    }
}
