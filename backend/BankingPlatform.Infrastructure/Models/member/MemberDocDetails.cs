using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.member
{
    public class MemberDocDetails
    {
        // Primary Key (Composite)
        [Key]
        [Column(Order = 0)]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Key]
        [Column(Order = 1)]
        [Required]
        public int BranchId { get; set; }

        // Foreign Key to Member (Parent)
        [Required]
        public int MemberId { get; set; }

        [ForeignKey(nameof(MemberId) + "," + nameof(BranchId))]
        public virtual Member? Member { get; set; }

        [Required]
        [StringLength(20)]
        public string PanCardNo { get; set; } = ""!;

        [Required]
        [StringLength(20)]
        public string AadhaarCardNo { get; set; } = ""!;

        [Required]
        [StringLength(10)]
        public string MemberPicExt { get; set; } = ""!;

        [Required]
        [StringLength(10)]
        public string MemberSignExt { get; set; } = ""!;
    }
}
