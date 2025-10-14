using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.member
{
    
    public class MemberNominee
    {
        [Key]
        [Column(Order = 0)]
        public int Id { get; set; }

        [Column(Order = 1)]
        public int BranchId { get; set; }

        [Required]
        public int MemberId { get; set; }

        [Required, MaxLength(50)]
        public string FirstName { get; set; }

        [MaxLength(50)]
        public string? LastName { get; set; }

        [MaxLength(50)]
        public string? FirstNameSL { get; set; }

        [MaxLength(50)]
        public string? LastNameSL { get; set; }

        public int? Relation { get; set; }
        public int? Age { get; set; }
        public short? IsMinor { get; set; }
        public DateTime? DOB { get; set; }

        [MaxLength(150)]
        public string? NameOfGuardian { get; set; }

        [MaxLength(150)]
        public string? NameOfGuardianSL { get; set; }

        public DateTime? NominationDate { get; set; }

        [MaxLength(25)]
        public string? AadhaarCardNo { get; set; }
    }
}
