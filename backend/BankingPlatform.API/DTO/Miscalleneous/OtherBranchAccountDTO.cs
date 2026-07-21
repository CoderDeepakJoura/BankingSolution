namespace BankingPlatform.API.DTO.Miscalleneous
{
    public class OtherBranchAccountDTO
    {
        public int Id { get; set; }
        public int BrId { get; set; }
        public int OtherBrId { get; set; }
        public int AccId { get; set; }
        public string? OtherBranchCode { get; set; }
        public string? OtherBranchName { get; set; }
        public string? AccountName { get; set; }
    }
}
