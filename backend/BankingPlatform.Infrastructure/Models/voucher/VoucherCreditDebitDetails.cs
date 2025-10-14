using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.voucher
{
    public class VoucherCreditDebitDetails
    {
        [Key]
        [Column(Order = 0)]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column(Order = 1)]
        [Required]
        public int BrId { get; set; }

        // Foreign Key to Voucher (Header)
        [Required]
        public int VoucherID { get; set; }

        // Account Details
        [Required]
        public int AccountId { get; set; }

        [Required]
        public long AccHeadCode { get; set; }

        // Transaction Details
        [Required]
        [Column(TypeName = "numeric(24, 2)")]
        public decimal VoucherAmount { get; set; }

        [Required]
        [StringLength(2)]
        public string VoucherEntryType { get; set; } = ""!;

        // Narration and Status
        [StringLength(300)]
        public string? Narration { get; set; }

        [Required]
        [StringLength(10)]
        public string EntryStatus { get; set; } = ""!;

        [Required]
        public DateTime ValueDate { get; set; }

        [Required]
        public int VoucherSeqNo { get; set; }

        // Financial/Calculated Fields
        [Column(TypeName = "numeric(24, 2)")]
        public decimal? IntDr { get; set; }

        [Column(TypeName = "numeric(24, 2)")]
        public decimal? IntCr { get; set; }

        [Column(TypeName = "numeric(24, 2)")]
        public decimal? ExpenseAmt { get; set; }
        [Required]
        public int HCL1 { get; set; }
        [Required]
        public int HCL2 { get; set; }
        [Required]
        public int HCL3 { get; set; }

        // System and Audit Fields
        [StringLength(10)]
        public string? VoucherStatus { get; set; }
    }
}
