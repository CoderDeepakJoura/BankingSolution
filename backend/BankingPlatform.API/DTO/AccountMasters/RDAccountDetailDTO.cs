namespace BankingPlatform.API.DTO.AccountMasters
{
    public class RDAccountDetailDTO
    {
        
        public int DetailId { get; set; }
        [Required]
        public int BrId { get; set; }
        public int? AccId { get; set; }
        public int? RdNumber { get; set; }
        public DateTime? RdDate { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "RD Amount must be greater than 0.")]
        public decimal? RdAmount { get; set; }

        [Range(1, 9999, ErrorMessage = "Number of months must be between 1 and 9999.")]
        public int? NoOfMonths { get; set; }
        public int? RdSlabId { get; set; }

        [Range(0, 100, ErrorMessage = "Interest Rate must be between 0 and 100.")]
        public double? InterestRate { get; set; }
        public DateTime? MaturityDate { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Kist Amount must be greater than 0.")]
        public decimal? KistAmt { get; set; }
        public int? KistInterval { get; set; }
        public DateTime? FirstKistDate { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Penalty Amount cannot be negative.")]
        public decimal? PenaltyAmt { get; set; }
        public int? Status { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Maturity Amount cannot be negative.")]
        public decimal? MaturityAmt { get; set; }
        public int? NoOfDays { get; set; }
        public int? CompoundingInterval { get; set; }
        public string? slabName { get; set; }
    }
}
