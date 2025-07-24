using System.ComponentModel.DataAnnotations;
namespace BankingPlatform.API.DTO
{
    public class ZoneMasterDTO
    {
        [Required(ErrorMessage = "Zone Code is required")]
        [StringLength(10, ErrorMessage = "Zone Code cannot exceed 10 characters.")]
        public string ZoneCode { get; set; } = "";


        [Required(ErrorMessage = "Zone Name is required")]
        [StringLength(50, ErrorMessage = "Zone Code cannot exceed 50 characters.")]
        public string ZoneName { get; set; } = "";

        [StringLength(50, ErrorMessage = "Zone Code SL cannot exceed 50 characters.")]
        public string ZoneNameSL { get; set; } = null;
    }
}
