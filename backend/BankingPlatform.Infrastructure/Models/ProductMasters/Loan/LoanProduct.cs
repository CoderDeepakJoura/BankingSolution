using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Loan
{
    public class LoanProduct
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Required]
        [Column("code")]
        [StringLength(3)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [Column("productname")]
        [StringLength(50)]
        public string ProductName { get; set; } = string.Empty;

        [Column("namesl")]
        [StringLength(75)]
        public string? NameSL { get; set; }

        [Required]
        [Column("effectivefrom", TypeName = "timestamp without time zone")]
        public DateTime EffectiveFrom { get; set; }
    }
}
