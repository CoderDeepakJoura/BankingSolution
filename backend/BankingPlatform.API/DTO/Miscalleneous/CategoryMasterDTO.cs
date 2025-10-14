using System.ComponentModel.DataAnnotations;
namespace BankingPlatform.API.DTO.Miscalleneous
{
    public class CategoryMasterDTO
    {
        public CategoryMasterDTO() { }

        public CategoryMasterDTO(string categoryName, string? categoryNameSl, int categoryId, int branchId)
        {
            CategoryName = categoryName;
            CategoryNameSL = categoryNameSl;
            CategoryId = categoryId;
            BranchId = branchId;
            
        }

        [Required(ErrorMessage = "Category Name is required")]
        [StringLength(50, ErrorMessage = "Category Name cannot exceed 50 characters.")]
        public string CategoryName { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Category Name SL cannot exceed 50 characters.")]
        public string? CategoryNameSL { get; set; } = string.Empty;

        public int CategoryId { get; set; } = 0;
        [Required]
        public int BranchId { get; set; }

    }
}
