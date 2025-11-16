namespace BankingPlatform.API.DTO.BranchSession
{
    public class BranchSessionDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int SessionFrom { get; set; }
        public int SessionTo { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public bool IsCurrent { get; set; }
        public bool IsFirst { get; set; }

        public string BranchSessionInfo { get; set; } = ""!;
    }
}
