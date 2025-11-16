namespace BankingPlatform.API.DTO.BranchMaster
{
    public class BranchMasterDto
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Society ID is required.")]
        public int SocietyId { get; set; }

        [StringLength(20, ErrorMessage = "Branch code cannot exceed 20 characters.")]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Branch name is required.")]
        [StringLength(200, ErrorMessage = "Branch name cannot exceed 200 characters.")]
        public string Name { get; set; } = string.Empty;

        [StringLength(250, ErrorMessage = "Branch name (in SL) cannot exceed 250 characters.")]
        public string? NameSL { get; set; }

        [StringLength(200, ErrorMessage = "Address cannot exceed 200 characters.")]
        public string AddressLine { get; set; } = string.Empty;

        [StringLength(250, ErrorMessage = "Address (in SL) cannot exceed 250 characters.")]
        public string? AddressLineSL { get; set; }

        public int? AddressType { get; set; }

        public int StationId { get; set; }

        [StringLength(5, ErrorMessage = "Phone prefix cannot exceed 5 characters.")]
        public string PhonePrefix1 { get; set; } = string.Empty;

        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")]
        public string PhoneNo1 { get; set; } = string.Empty;

        public int PhoneType1 { get; set; }

        [StringLength(5, ErrorMessage = "Phone prefix cannot exceed 5 characters.")]
        public string? PhonePrefix2 { get; set; }

        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")]
        public string? PhoneNo2 { get; set; }

        public int? PhoneType2 { get; set; }

        public bool IsMainBranch { get; set; }

        public int? SequenceNo { get; set; }

        [StringLength(50, ErrorMessage = "Email ID cannot exceed 50 characters.")]
        [EmailAddress(ErrorMessage = "Invalid email address format.")]
        public string EmailId { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Pincode cannot exceed 50 characters.")]
        public string Pincode { get; set; } = string.Empty;

        public int TehsilId { get; set; }

        [StringLength(25, ErrorMessage = "GSTIN cannot exceed 25 characters.")]
        public string GSTINNo { get; set; } = string.Empty;

        public DateTime GSTNoIssueDate { get; set; }

        public int StateId { get; set; }
    }
}
