using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.voucher
{
    [Table("vrodreserve")]
    public class VrOdReserve
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("vacccrdrid")]
        public int? VAccCrDrId { get; set; }

        [Column("voucherid")]
        public int? VoucherId { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("accid")]
        public int AccId { get; set; }

        [Column("debit", TypeName = "numeric(18,2)")]
        public decimal Debit { get; set; }

        [Column("credit", TypeName = "numeric(18,2)")]
        public decimal Credit { get; set; }

        [Column("productid")]
        public int ProductId { get; set; }
    }
}
