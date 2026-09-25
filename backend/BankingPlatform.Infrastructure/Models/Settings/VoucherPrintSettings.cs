using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    public class VoucherPrintSettings
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int VoucherType { get; set; }

        [Required]
        public int VoucherSubType { get; set; }

        [Required]
        public bool IsEnabled { get; set; }

        [Required]
        public int Copies { get; set; } = 1;
    }
}
