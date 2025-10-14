using BankingPlatform.Infrastructure.Models;

namespace BankingPlatform.API.DTO.AccountMasters
{
    public class AccountMasterDTO
    {
        public AccountMasterDTO() { }

        public AccountMasterDTO(
       int branchId,
       int headId,
       long headCode,
       int accTypeId,
       string accountNumber,
       string accountName,
       DateTime accOpeningDate,
       bool isAccClosed,
       short? isAccAddedManually = 0,
       int? generalProductId = null,
       string? accPrefix = null,
       int? accSuffix = null,
       string? accountNameSL = null,
       int? memberId = null,
       int? memberBranchId = null,
       DateTime? closingDate = null,
       string? closingRemarks = null,
       short? isJointAccount = 0,
       short? isSuspenseAccount = 0
   )
        {
            BranchId = branchId;
            HeadId = headId;
            HeadCode = headCode;
            AccTypeId = accTypeId;
            AccountNumber = accountNumber;
            AccountName = accountName;
            AccOpeningDate = accOpeningDate;
            IsAccClosed = isAccClosed;
            IsAccAddedManually = isAccAddedManually;
            GeneralProductId = generalProductId;
            AccPrefix = accPrefix;
            AccSuffix = accSuffix;
            AccountNameSL = accountNameSL;
            MemberId = memberId;
            MemberBranchId = memberBranchId;
            ClosingDate = closingDate;
            ClosingRemarks = closingRemarks;
            IsJointAccount = isJointAccount;
            IsSuspenseAccount = isSuspenseAccount;
        }
        public int AccId { get; set; } = 0;

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int HeadId { get; set; }

        [Required]
        public long HeadCode { get; set; }

        [Required]
        public int AccTypeId { get; set; }

        public int? GeneralProductId { get; set; }

        [Required]
        [StringLength(50, ErrorMessage = "Account number cannot exceed 50 characters.")]
        public string AccountNumber { get; set; } = string.Empty;

        [StringLength(20, ErrorMessage = "Account prefix cannot exceed 20 characters.")]
        public string? AccPrefix { get; set; }

        [Range(0, 99999999, ErrorMessage = "Account suffix cannot exceed 8 digits.")]
        public int? AccSuffix { get; set; }

        [Required]
        [StringLength(100, ErrorMessage = "Account name cannot exceed 100 characters.")]
        public string AccountName { get; set; } = ""!;

        [StringLength(100, ErrorMessage = "Account name (SL) cannot exceed 100 characters.")]
        public string? AccountNameSL { get; set; }

        public int? MemberId { get; set; }

        public int? MemberBranchId { get; set; }

        [Required(ErrorMessage = "Account opening date is required.")]
        public DateTime AccOpeningDate { get; set; }

        [Required]
        public bool IsAccClosed { get; set; } = false;

        public DateTime? ClosingDate { get; set; }

        [StringLength(255, ErrorMessage = "Closing remarks cannot exceed 255 characters.")]
        public string? ClosingRemarks { get; set; }

        [Range(0, 1, ErrorMessage = "Value must be 0 or 1.")]
        public short? IsAccAddedManually { get; set; } = 0;
        public short? IsJointAccount { get; set; } = 0;
        public short? IsSuspenseAccount { get; set; } = 0;
        public string? HeadName { get; set; } = ""!;
        public int? SMAccId { get; set; }
    }
}
