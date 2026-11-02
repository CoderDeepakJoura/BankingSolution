namespace BankingPlatform.API.DTO.Agent
{
    public class UnpostedCollectionDTO
    {
        public int CollectionId { get; set; }
        public int AgentId { get; set; }
        public string AgentName { get; set; } = "";
        public int AccountId { get; set; }
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccType { get; set; } = "";
        public decimal Amount { get; set; }
        public DateTime CollectionDate { get; set; }
        public string? Notes { get; set; }
    }

    public class BatchPostCollectionsDTO
    {
        public int BranchId { get; set; }
        public List<int> CollectionIds { get; set; } = new();
        public DateTime VoucherDate { get; set; }
        public string? Narration { get; set; }
    }

    public class PostCollectionResultDTO
    {
        public int CollectionId { get; set; }
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public decimal Amount { get; set; }
        public bool Success { get; set; }
        public string? Error { get; set; }
        public int? VoucherId { get; set; }
        public int? VoucherNo { get; set; }
    }
}
