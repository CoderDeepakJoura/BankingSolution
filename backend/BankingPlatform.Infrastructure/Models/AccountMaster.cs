using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models
{
    public class AccountMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int HeadId { get; set; }

        [Required]
        public long HeadCode { get; set; }

        [Required]
        public int AccTypeId { get; set; }

        public int? GeneralProductId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AccountNumber { get; set; } = ""!;

        [MaxLength(20)]
        public string? AccPrefix { get; set; }

        [Range(0, 9999, ErrorMessage = "Account suffix cannot exceed 4 digits.")]
        public int? AccSuffix { get; set; }

        [MaxLength(100)]
        public string? AccountName { get; set; }

        [MaxLength(100)]
        public string? AccountNameSL { get; set; }

        public int? MemberId { get; set; }
        public int? MemberBranchID { get; set; }

        [Column(TypeName = "date")]
        public DateTime AccOpeningDate { get; set; }

        public bool IsAccClosed { get; set; }

        [Column(TypeName = "date")]
        public DateTime? ClosingDate { get; set; }

        [MaxLength(255)]
        public string? ClosingRemarks { get; set; }

        public short? IsAccAddedManually { get; set; }
        public short? IsJointAccount { get; set; }
        public short? IsSuspenseAccount { get; set; }
    }
}
