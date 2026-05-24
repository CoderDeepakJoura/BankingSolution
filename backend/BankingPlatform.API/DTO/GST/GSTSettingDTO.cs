namespace BankingPlatform.API.DTO.GST
{
    public class GSTSettingDTO
    {
        public int BranchId { get; set; }
        public int RoundOffExpAccId { get; set; }
        public int RoundOffIncAccId { get; set; }
        public string? RoundOffExpAccDisplay { get; set; }
        public string? RoundOffIncAccDisplay { get; set; }
    }
}
