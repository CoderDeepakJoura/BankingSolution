using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.voucher
{
    public class Voucher
    {
        [Key]
        [Column(Order = 0)]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column(Order = 1)]
        [Required]
        public int BrID { get; set; }

        // Voucher Identification
        [Required]
        public int VoucherNo { get; set; }

        [Required]
        public int VoucherType { get; set; }

        [Required]
        public int VoucherSubType { get; set; }

        // Date and Time
        [Required]
        public DateTime VoucherDate { get; set; }

        public DateTime? ActualTime { get; set; } // Corresponds to Voucher_ActualTime

        // Narration and Status
        [StringLength(500)]
        public string? VoucherNarration { get; set; }

        [Required]
        [StringLength(2)]
        public string VoucherStatus { get; set; } = ""!;

        // Audit and Verification
        public int? AddedBy { get; set; } // Corresponds to VoucherAddedBy
        public int? ModifiedBy { get; set; } // Corresponds to VoucherModifiedBy
        public int? VerifiedBy { get; set; } // Corresponds to VoucherVerifiedBy

        // System Synchronization
        public int? OtherBrID { get; set; }

        // Navigation property for cascade delete relationship
        //public virtual ICollection<VoucherCreditDebitDetails>? CreditDebitDetails { get; set; }
    }
}
