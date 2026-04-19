using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.InterestSlabs.Loan
{
    public class CombinedLoanSlabDTO
    {
        public LoanSlabDTO loanSlab { get; set; } = new();
        public List<LoanSlabDetailDTO> loanSlabDetails { get; set; } = new();
    }

    public class LoanSlabDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BrId { get; set; }

        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;

        [StringLength(50)]
        public string? NameSL { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public int LoanProductId { get; set; }

        public string? ProductName { get; set; }
    }

    public class LoanSlabDetailDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BrId { get; set; }

        [Required]
        public int SlabId { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal FromAmount { get; set; }

        [Required]
        [Range(1, double.MaxValue)]
        public decimal ToAmount { get; set; }

        public int? PeriodFrom { get; set; }

        public int? PeriodTo { get; set; }

        public int? PeriodFromInDays { get; set; }

        public int? PeriodToInDays { get; set; }

        [Range(0, 100)]
        public double? StdIntRate { get; set; }

        [Range(0, 100)]
        public double? PenalIntRate { get; set; }
    }
}
