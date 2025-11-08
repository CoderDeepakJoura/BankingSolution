namespace BankingPlatform.API.DTO.InterestSlabs.Saving
{
    public class CombinedSavingIntDTO
    {
        public SavingInterestSlabDTO savingInterestSlab { get; set; } = new ();
        public List<SavingInterestSlabDetailDTO> savingInterestSlabDetails { get; set; } = new ();
    }

    public class SavingInterestSlabDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public string SlabName { get; set; } = ""!;
        [Required]
        public int SavingProductId { get; set; }
        [Required]
        public DateTime ApplicableDate { get; set; }
    }

    public class SavingInterestSlabDetailDTO
    {
        public int? Id { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required]
        public int SavingIntSlabId { get; set; }
        [Required]
        public decimal FromAmount { get; set; }
        [Required]
        public decimal ToAmount { get; set; }
        [Required]
        public decimal InterestRate { get; set; }
    }
}
