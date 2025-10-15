namespace BankingPlatform.API.DTO.AccountHead
{
    public class AccountHeadTypeDTO
    {
        public AccountHeadTypeDTO() { }
        public AccountHeadTypeDTO(string accountheadtypeName, string? accountheadtypeNameSl, int accountheadtypeId, int branchId, int categoryId, string categoryName = "")
        {
            AccountHeadTypeName = accountheadtypeName;
            AccountHeadTypeNameSL = accountheadtypeNameSl;
            AccountHeadTypeId = accountheadtypeId;
            BranchId = branchId;
            CategoryId = categoryId;
            CategoryName = categoryName;
        }

        [Required(ErrorMessage = "Account Head Type Name is required")]
        [StringLength(50, ErrorMessage = "Account Head Type Name cannot exceed 50 characters.")]
        public string AccountHeadTypeName { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Account Head Type Name SL cannot exceed 50 characters.")]
        public string? AccountHeadTypeNameSL { get; set; } = string.Empty;

        public int AccountHeadTypeId { get; set; } = 0;
        public int BranchId { get; set; } = 0;
        [Required]
        public int CategoryId { get; set; } = 0;
        public string? CategoryName { get; set; } = string.Empty;
    }
}
