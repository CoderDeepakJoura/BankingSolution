namespace BankingPlatform.API.DTO.AccountHead
{
    public class AccountHeadDTO
    {
        public AccountHeadDTO() { }

        // Fixed constructor parameter name
        public AccountHeadDTO(string accountheadName, string? accountheadNameSl, int branchID, string accountHeadType, string? isAnnexure, string? showInReport, string headCode, int accountheadId, string? parentHeadCode, int? parentid, string accountHeadTypeName = "")
        {
            AccountHeadName = accountheadName;
            AccountHeadNameSL = accountheadNameSl;
            AccountHeadId = accountheadId;
            BranchID = branchID;
            AccountHeadType = accountHeadType;
            IsAnnexure = isAnnexure;
            ShowInReport = showInReport;
            HeadCode = headCode;
            ParentHeadCode = parentHeadCode; // Fixed assignment
            ParentId = parentid;
            AccountHeadTypeName = accountHeadTypeName;
        }

        [Required(ErrorMessage = "Branch ID is required")]
        public int BranchID { get; set; }

        [Required(ErrorMessage = "Account Head Name is required")]
        [StringLength(50, ErrorMessage = "Account Head Name cannot exceed 50 characters.")]
        public string AccountHeadName { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Account Head Name SL cannot exceed 50 characters.")]
        public string? AccountHeadNameSL { get; set; } = string.Empty;

        [Required(ErrorMessage = "Account Head Type is required")]
        public string AccountHeadType { get; set; } = string.Empty;

        public string? IsAnnexure { get; set; } = string.Empty;

        public string? ShowInReport { get; set; } = string.Empty;

        [Required(ErrorMessage = "Account Head Code is required")]
        public string HeadCode { get; set; } = string.Empty;

        public string? ParentHeadCode { get; set; } = string.Empty;

        public int AccountHeadId { get; set; } = 0;
        public int? ParentId { get; set; } = 0;
        public string? AccountHeadTypeName { get; set; }
    }
}
