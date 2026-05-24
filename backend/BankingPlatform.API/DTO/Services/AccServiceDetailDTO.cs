namespace BankingPlatform.API.DTO.Services
{
    public class AccServiceDetailDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int AccId { get; set; }
        public int ServiceId { get; set; }
        public string? AccDisplay { get; set; }
        public string? ServiceName { get; set; }
    }
}
