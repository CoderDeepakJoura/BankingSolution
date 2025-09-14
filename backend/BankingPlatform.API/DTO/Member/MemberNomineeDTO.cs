namespace BankingPlatform.API.DTO.Member
{
    public class MemberNomineeDTO
    {
        [Required]
        public int Id { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required]
        public int MemberId { get; set; }
        [Required]
        public string FirstName { get; set; } = string.Empty!;
        public string? LastName { get; set; }
        public string? FirstNameSL { get; set; }
        public string? LastNameSL { get; set; }

        public int? Relation { get; set; }
        public int? Age { get; set; }
        public short? IsMinor { get; set; }
        public DateTime? DOB { get; set; }

        public string? NameOfGuardian { get; set; }
        public string? NameOfGuardianSL { get; set; }

        public DateTime? NominationDate { get; set; }
        public string? AadhaarCardNo { get; set; }
    }
}
