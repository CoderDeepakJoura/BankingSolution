namespace BankingPlatform.API.DTO.BranchWiseRule
{
    public class SavingDTO
    {
        public int? Id { get; set; } 

        [Required]
        public int BranchId { get; set; }
        [Required]
        public int SavingProductId { get; set; }
        [Required]
        public int intexpaccount { get; set; }
        public int? depwithdrawlimitinterval { get; set; }
        public decimal? depwithdrawlimit { get; set; }
    }
}
