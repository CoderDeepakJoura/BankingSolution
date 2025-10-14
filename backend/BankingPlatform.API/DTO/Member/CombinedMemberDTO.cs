using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Voucher;

namespace BankingPlatform.API.DTO.Member
{
    public class CombinedMemberDTO
    {
        // Main member details
        public MemberDTO Member { get; set; } = new();

        // Nominees
        public List<MemberNomineeDetailsDTO> Nominees { get; set; } = new();

        // Document details
        public MemberDocDetailsDTO DocumentDetails { get; set; } = new();

        // Location details
        public MemberLocationDetailsDTO LocationDetails { get; set; } = new();
        public AccountMasterDTO? AccMaster { get; set; } = new();
        public VoucherDTO Voucher { get; set; } = new();

        public IFormFile? MemberPhoto { get; set; }
        public IFormFile? MemberSignature { get; set; }
        public int? VoucherId { get; set; }
    }
    public class CreateMemberRequest
    {
        [Required]
        public string MemberData { get; set; } = string.Empty;
        public IFormFile? MemberPhoto { get; set; }
        public IFormFile? MemberSignature { get; set; }
    }
}
