using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.Tehsil
{
    public class TehsilMasterDTO
    {
        public TehsilMasterDTO() { }

        public TehsilMasterDTO(string tehsilName, string tehsilCode, string? tehsilNameSl, int tehsilId)
        {
            TehsilName = tehsilName;
            TehsilCode = tehsilCode;
            TehsilNameSL = tehsilNameSl;
            TehsilId = tehsilId;
        }

        [Required(ErrorMessage = "Tehsil Code is required")]
        [StringLength(10, ErrorMessage = "Tehsil Code cannot exceed 10 characters.")]
        public string TehsilCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tehsil Name is required")]
        [StringLength(50, ErrorMessage = "Tehsil Name cannot exceed 50 characters.")]
        public string TehsilName { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Tehsil Name SL cannot exceed 50 characters.")]
        public string? TehsilNameSL { get; set; } = string.Empty;

        public int TehsilId { get; set; } = 0;
    }
}
