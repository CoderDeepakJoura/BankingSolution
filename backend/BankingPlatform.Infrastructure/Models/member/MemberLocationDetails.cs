using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.member
{
    public class MemberLocationDetails
    {
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
        [StringLength(150)]
        public string AddressLine1 { get; set; } = ""!;

        [StringLength(150)]
        public string? AddressLineSL1 { get; set; }

        [StringLength(150)]
        public string? AddressLine2 { get; set; }

        [StringLength(150)]
        public string? AddressLineSL2 { get; set; }

        [Required]
        public int VillageId1 { get; set; }

        public int VillageId2 { get; set; }

        [Required]
        public int PO1 { get; set; }

        public int PO2 { get; set; }

        [Required]
        public int Tehsil1 { get; set; }

        public int Tehsil2 { get; set; }

        [Required]
        public int ThanaId1 { get; set; }

        public int ThanaId2 { get; set; }

        [Required]
        public int ZoneId1 { get; set; }

        public int ZoneId2 { get; set; }
    }
}
