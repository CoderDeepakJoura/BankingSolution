using BankingPlatform.API.DTO.Voucher;

namespace BankingPlatform.API.DTO.AccountMasters
{
    public class CommonAccMasterDTO
    {
        public AccountMasterDTO? AccountMasterDTO { get; set; }
        public GSTInfoDTO? GSTInfoDTO { get; set; }
        public VoucherDTO? Voucher { get; set; } = new();
        public AccountDocDetailsDTO? AccountDocDetailsDTO { get; set; } = new();
        public List<AccountNomineeInfoDTO>? AccNomineeDTO { get; set; } = new();
        public List<JointAccountInfoDTO>? JointAccountInfoDTO { get; set; } = new();
        public JointAccountWithdrawalInfoDTO? JointAccountWithdrawalInfoDTO { get; set; } = new();
        public List<FDAccountDetailDTO>? FDAccountDetailDTO { get; set; } = new();
        public FDVoucherDetailDTO? FDVoucherDetailDTO { get; set; } = new();
        public MatureOrRenewFDInfo? MatureOrRenewFDInfo { get; set; } = new();
        public MatureOrRenewRDInfo? MatureRDInfo { get; set; } = new();
        public CreditAccountDetails? CreditAccountDetails { get; set; } = new();
        public FDAccountDetailDTO? FDAccountDetailDTOSingle { get; set; }
        public RDAccountDetailDTO? RDAccountDetailDTO { get; set; }

        public IFormFile? Picture { get; set; }
        public IFormFile? Signature { get; set; }
        public string? OpeningBalance { get; set; }
        public string? OpeningBalanceType { get; set; }
        public string? ProductName { get; set; }
        public int? AccountType { get; set; }
        public string? SavingAccountName { get; set; }
        public decimal? PreMaturityAmount { get; set; }
        

    }
    public class CreateAccountCreationRequest
    {
        [Required]
        public string AccountData { get; set; } = string.Empty;
        public IFormFile? Picture { get; set; }
        public IFormFile? Signature { get; set; }
    }

    public class AccountNomineeInfoDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int AccountId { get; set; }
        public string NomineeName { get; set; } = ""!;
        public DateTime NomineeDob { get; set; }
        public int RelationWithAccHolder { get; set; }
        public string AddressLine { get; set; } = ""!;
        public DateTime NomineeDate { get; set; }
        public short IsMinor { get; set; }
        public string? NameOfGuardian { get; set; }

    }

    public class CreditAccountDetails
    {
        public int? GeneralAccountId { get; set; }
        public int? SavingAccountId { get; set; }
        public int? LoanAccountId { get; set; }
        public int? CashAccountId { get; set; }
        public decimal? GeneralAmount { get; set; }
        public decimal? SavingAmount { get; set; }
        public decimal? LoanAmount { get; set; }
        public decimal? CashAmount { get; set; }

    }

    public class MatureOrRenewFDInfo
    {
        public int? ProductId { get; set; }
        public int? DetailId { get; set; }
        public int? FDAccountId { get; set; }
        public int? BranchId { get; set; }
        public DateTime VoucherDate { get; set; }
        public decimal? PostMaturityAmount { get; set; }
        public decimal? IntPayableAmount { get; set; }
        public bool IsRenew { get; set; }
        public string? Narration { get; set; }
    }

    public class MatureOrRenewRDInfo
    {
        public int? ProductId { get; set; }
        public int? DetailId { get; set; }
        public int? RDAccountId { get; set; }
        public int? BranchId { get; set; }
        public DateTime VoucherDate { get; set; }
        public string? Narration { get; set; }
        public decimal IntDr { get; set; }
        public decimal IntCr { get; set; }
        public decimal PenalAmount { get; set; }
        public decimal intPayableAmount { get; set; }
        public decimal PostMaturityAmount { get; set; }
        public int PenalAccountId { get; set; }
        public decimal PreMaturityAmount { get; set; }
        

    }
    public class AccountDocDetailsDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int AccountId { get; set; }
        public string? PicExt { get; set; }
        public string? SignExt { get; set; }

        // Helper properties for file handling
        public string? PictureUrl { get; set; }
        public string? SignatureUrl { get; set; }
        public string? PictureBase64 { get; set; }
        public string? SignatureBase64 { get; set; }
    }

    public class JointAccountInfoDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public string AccountName { get; set; } = ""!;
        public int RelationWithAccHolder { get; set; }
        public DateTime Dob { get; set; }
        public string AddressLine { get; set; } = ""!;
        public int Gender { get; set; }
        public int MemberId { get; set; }
        public int MemberBrId { get; set; }
        public int JointWithAccountId { get; set; }
        public string? JointAccHolderAccountNumber { get; set; }
    }

    public class JointAccountWithdrawalInfoDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int AccountId { get; set; }
        public int MinimumPersonsRequiredForWithdrawal { get; set; }
        public short JointAccountHolderCompulsoryForWithdrawal { get; set; }

    }

}
