using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.Member
{
    public class MemberDTO
    {
        // Primary keys (required)
        public int? Id { get; set; } // Nullable for new records (Identity will generate)

        [Required]
        public int BranchId { get; set; }

        // Core Member Details (Database Fields Only)
        [Required]
        public int DefAreaBrId { get; set; }

        public int? MemberType { get; set; }

        [StringLength(20)]
        public string? NominalMembershipNo { get; set; }

        [StringLength(20)]
        public string? PermanentMembershipNo { get; set; }

        // Name Details
        [Required, StringLength(100)]
        public string MemberName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? MemberNameSL { get; set; }


        // Relationship Details
        [Required, StringLength(100)]
        public string RelativeName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? RelativeNameSL { get; set; }


        [Required]
        public int RelationId { get; set; }

        // Personal Details
        [Required]
        public int Gender { get; set; }

        [Required]
        public DateTime DOB { get; set; }

        // Categorization
        [Required]
        public int CasteId { get; set; }

        [Required]
        public int CategoryId { get; set; }

        [Required]
        public int OccupationId { get; set; }

        // Dates
        [Required]
        public DateTime JoiningDate { get; set; }

        // Contact Details (Database Fields)
        [Required, StringLength(5)]
        public string PhonePrefix1 { get; set; } = string.Empty;

        [Required]
        public int PhoneType1 { get; set; }

        [Required, StringLength(20)]
        public string PhoneNo1 { get; set; } = string.Empty;

        [StringLength(5)]
        public string? PhonePrefix2 { get; set; }

        public int? PhoneType2 { get; set; }

        [StringLength(20)]
        public string? PhoneNo2 { get; set; }
        public string? Email1 { get; set; }
        public string? Email2 { get; set; }

        // Status (Database Field Names)
        public int MemberStatus { get; set; } = 1; // Exact database column name

        public DateTime MemberStatusDate { get; set; } = DateTime.Now;
    }
}
