using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.Miscalleneous
{
    public class ExpenseCategoryDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [StringLength(20)]
        public string? Code { get; set; }

        [StringLength(100)]
        public string? Description { get; set; }

        [StringLength(200)]
        public string? DescriptionSL { get; set; }
    }
}
