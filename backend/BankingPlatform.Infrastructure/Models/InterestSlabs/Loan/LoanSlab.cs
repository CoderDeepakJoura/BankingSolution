using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.Loan
{
    public class LoanSlab
    {
        [Key, Required]
        public int Id { get; set; }

        [Required]
        public int BrId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? NameSL { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public int LoanProductId { get; set; }
    }
}