using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.Loan
{
    public class LoanSlabDetail
    {
        [Key, Required]
        public int Id { get; set; }

        [Required]
        public int BrId { get; set; }

        [Required]
        public int SlabId { get; set; }

        [Required]
        public decimal FromAmount { get; set; }

        [Required]
        public decimal ToAmount { get; set; }

        public int? PeriodFrom { get; set; }

        public int? PeriodTo { get; set; }

        public int? PeriodFromInDays { get; set; }

        public int? PeriodToInDays { get; set; }

        public double? StdIntRate { get; set; }

        public double? PenalIntRate { get; set; }
    }
}