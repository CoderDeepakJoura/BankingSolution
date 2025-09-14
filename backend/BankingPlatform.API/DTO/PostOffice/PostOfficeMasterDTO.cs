using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.PostOffice
{
    public class PostOfficeMasterDTO
    {
        public PostOfficeMasterDTO() { }

        public PostOfficeMasterDTO(string postOfficeName, string postOfficeCode, string? postOfficeNameSl, int postOfficeId, int branchId)
        {
            PostOfficeName = postOfficeName;
            PostOfficeCode = postOfficeCode;
            PostOfficeNameSL = postOfficeNameSl;
            PostOfficeId = postOfficeId;
            BranchId = branchId;
        }

        [Required(ErrorMessage = "Post Office Code is required")]
        [StringLength(10, ErrorMessage = "PostOffice Code cannot exceed 10 characters.")]
        public string PostOfficeCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Post Office Name is required")]
        [StringLength(50, ErrorMessage = "PostOffice Name cannot exceed 50 characters.")]
        public string PostOfficeName { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Post Office Name SL cannot exceed 50 characters.")]
        public string? PostOfficeNameSL { get; set; } = string.Empty;

        public int PostOfficeId { get; set; } = 0;
        [Required]
        public int BranchId { get; set; } = 0;
    }
}
