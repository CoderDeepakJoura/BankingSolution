using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.voucher
{
    public class VoucherSavingDetail
    {
        public int? Id { get; set; }

        [Required(ErrorMessage = "Branch ID is required")]
        public int BrId { get; set; }

        public int VAccCrDrId { get; set; }

        [StringLength(3, ErrorMessage = "Operation must be maximum 3 characters")]
        [RegularExpression("^(SD|SW|IP)$", ErrorMessage = "Operation must be either 'SD' or 'SW' or 'IP'")]
        public string? Operation { get; set; }

        public int? AccId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Amount must be positive")]
        public decimal? Amt { get; set; }

        public int? ChequeBookId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Cheque number must be positive")]
        public int? ChequeNo { get; set; }

        public DateTime ValueDate { get; set; }

        public DateTime VoucherDate { get; set; }

        [StringLength(2, ErrorMessage = "Voucher status must be maximum 2 characters")]
        public string VoucherMainStatus { get; set; } = ""!;
        public int VoucherId { get; set; }
    }
}
