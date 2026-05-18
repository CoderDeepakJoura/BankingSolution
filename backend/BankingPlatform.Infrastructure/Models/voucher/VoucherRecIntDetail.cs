using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.voucher
{
    public class VoucherRecIntDetail
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int BrId { get; set; }

        public int VAccCrDrId { get; set; }
        public int VoucherId { get; set; }
        public int VoucherNo { get; set; }
        public DateTime EntryDate { get; set; }
        public DateTime ValueDate { get; set; }
        public int IntCatId { get; set; }
        public double? Pamt { get; set; }
        public int AccId { get; set; }
        public double IntDr { get; set; }
        public double IntCr { get; set; }

        [MaxLength(2)]
        public string? VoucherMainStatus { get; set; }
    }
}