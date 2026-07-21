namespace BankingPlatform.API.DTO.CommonDTO
{
    public class CommonDTO
    {
        public int? BranchId { get; set; } = 0!;
    }

    public class CalculateFDMaturityDTO
    {
        public int BranchId { get; set; }
        public int ProductId { get; set; }
        public decimal Amount { get; set; }
        public decimal InterestRate { get; set; }
        public DateTime FdDate { get; set; }
        public DateTime MaturityDate { get; set; }
        public string? CompoundingInterval { get; set; }
    }
}
