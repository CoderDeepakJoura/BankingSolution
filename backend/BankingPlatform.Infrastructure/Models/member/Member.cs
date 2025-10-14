using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.member
{
    public class Member
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

        [Required]
        public int DefAreaBrId { get; set; }

        public int? MemberType { get; set; }

        [StringLength(20)]
        public string? NominalMembershipNo { get; set; }

        [StringLength(20)]
        public string? PermanentMembershipNo { get; set; }

        [Required]
        [StringLength(100)]
        public string MemberName { get; set; } = ""!;

        [StringLength(100)]
        public string? MemberNameSL { get; set; }

        [Required]
        [StringLength(100)]
        public string RelativeName { get; set; } = ""!;

        [StringLength(100)]
        public string? RelativeNameSL { get; set; }


        [Required]
        public int RelationId { get; set; }

        [Required]
        public int Gender { get; set; }

        [Required]
        public DateTime DOB { get; set; }

        [Required]
        public int CasteId { get; set; }

        [Required]
        public int CategoryId { get; set; }

        [Required]
        public DateTime JoiningDate { get; set; }

        [Required]
        public int OccupationId { get; set; }

        [Required]
        [StringLength(5)]
        public string PhonePrefix1 { get; set; } = ""!;

        [Required]
        public int PhoneType1 { get; set; }

        [Required]
        [StringLength(20)]
        public string PhoneNo1 { get; set; } = ""!;

        [StringLength(5)]
        public string? PhonePrefix2 { get; set; }

        public int? PhoneType2 { get; set; }

        [StringLength(20)]
        public string? PhoneNo2 { get; set; }

        [Required]
        public int MemberStatus { get; set; }

        [Required]
        public DateTime MemberStatusDate { get; set; }

        public string? Email1 { get; set; } = ""!;
        public string? Email2 { get; set; } = ""!;

    }
}
