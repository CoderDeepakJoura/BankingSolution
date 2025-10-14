namespace BankingPlatform.API.DTO.Member
{
    public class MemberNomineeDetailsDTO
    {
        [Required]
        public int Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        // Foreign Key to Parent Member
        [Required]
        public int MemberId { get; set; }

        // Nominee Personal Details
        [Required, StringLength(100)]
        public string NomineeName { get; set; } = string.Empty;

        [StringLength(10)]
        public string? NomRelativeName { get; set; }

        [Required]
        public int RelationId { get; set; }

        [Required]
        public int RelationWithMember { get; set; }

        [Required]
        public int Age { get; set; }

        [Required]
        public DateTime DOB { get; set; }

        public short? IsMinor { get; set; } // Maps to SMALLINT

        [StringLength(100)]
        public string? NameOfGuardian { get; set; }

        [StringLength(100)]
        public string? NameOfGuardianSL { get; set; }

        public DateTime? NominationDate { get; set; }

        // Document Details
        [StringLength(25)]
        public string AadhaarCardNo { get; set; } = string.Empty;

        [StringLength(25)]
        public string? PanCardNo { get; set; }

        // Share Details
        [Required]
        public decimal PercentageShare { get; set; }
    }
}
