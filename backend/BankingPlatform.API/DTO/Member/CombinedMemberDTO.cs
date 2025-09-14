namespace BankingPlatform.API.DTO.Member
{
    public class CombinedMemberDTO
    {
        public MemberDTO Member { get; set; } = new();
        public List<MemberNomineeDTO> Nominees { get; set; } = new();
    }
}
