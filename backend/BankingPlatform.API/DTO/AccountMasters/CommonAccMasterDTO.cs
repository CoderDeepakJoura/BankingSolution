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

        public IFormFile? Picture { get; set; }
        public IFormFile? Signature { get; set; }
        public string? OpeningBalance { get; set; }
        public string? OpeningBalanceType { get; set; }
        public string? ProductName { get; set; }

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
