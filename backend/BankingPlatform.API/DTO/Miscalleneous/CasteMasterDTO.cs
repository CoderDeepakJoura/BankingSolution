using System.Runtime.CompilerServices;

namespace BankingPlatform.API.DTO.Miscalleneous
{
    public class CasteMasterDTO
    {
        public CasteMasterDTO() { }

        public CasteMasterDTO(string casteDescription, string? casteDescriptionSl, int categoryId, int branchId, int casteId = 0, string categoryName = "")
        {
            CasteDescription = casteDescription;
            CasteDesciptionSL = casteDescriptionSl;
            CasteId = casteId;
            BranchId = branchId;
            CategoryId = categoryId;
            CategoryName = categoryName;
        }

        [Required(ErrorMessage = "Caste Name is required")]
        [StringLength(50, ErrorMessage = "Caste Name cannot exceed 50 characters.")]
        public string CasteDescription{ get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Caste Name SL cannot exceed 50 characters.")]
        public string? CasteDesciptionSL { get; set; } = string.Empty;
        public int CasteId { get; set; } = 0;

        [Required(ErrorMessage = "Category Name is required")]
        public int CategoryId { get; set; } = 0;
        public string CategoryName { get; set; } = ""!;
        [Required]
        public int BranchId { get; set; }
    }
}
