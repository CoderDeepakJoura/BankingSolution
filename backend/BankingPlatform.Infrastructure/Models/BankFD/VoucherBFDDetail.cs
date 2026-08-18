using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.BankFD
{
    [Table("voucherbfddetail")]
    public class VoucherBFDDetail
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("brid")]
        public int BrId { get; set; }

        [Required]
        [Column("vacccrdrid")]
        public int VAccCrDrId { get; set; }

        [Required]
        [Column("fdaccid")]
        public int FDAccId { get; set; }

        [Required]
        [Column("fdaccdetid")]
        public int FDAccDetId { get; set; }

        [Required]
        [Column("amountcr", TypeName = "numeric(18,2)")]
        public decimal AmountCr { get; set; } = 0;

        [Required]
        [Column("amountdr", TypeName = "numeric(18,2)")]
        public decimal AmountDr { get; set; } = 0;

        [Required]
        [Column("operation")]
        [MaxLength(5)]
        public string Operation { get; set; } = string.Empty;

        [Column("valuedate")]
        public DateTime ValueDate { get; set; }

        [Column("voucherdate")]
        public DateTime VoucherDate { get; set; }

        [Column("vouchermainstatus")]
        [MaxLength(2)]
        public string? VoucherMainStatus { get; set; }
    }
}
