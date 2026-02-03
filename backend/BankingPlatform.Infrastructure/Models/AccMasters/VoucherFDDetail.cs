using BankingPlatform.Infrastructure.Models.voucher;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.AccMasters
{
    [Table("voucherfddetail")]
    public class VoucherFDDetail
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("brid")]
        public int BrId { get; set; }

        [Required]
        [Column("voucherid")]
        public int VoucherId { get; set; }

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
        public DateTime? ValueDate { get; set; }

        [Column("voucherdate")]
        public DateTime? VoucherDate { get; set; }

        [Column("intdr", TypeName = "numeric(18,2)")]
        public decimal? IntDr { get; set; }

        [Column("intcr", TypeName = "numeric(18,2)")]
        public decimal? IntCr { get; set; }

        [Column("vouchermainstatus")]
        [MaxLength(2)]
        public string? VoucherMainStatus { get; set; }

    
    }
}
