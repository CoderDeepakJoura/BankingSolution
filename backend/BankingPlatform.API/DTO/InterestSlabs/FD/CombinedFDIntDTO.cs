namespace BankingPlatform.API.DTO.InterestSlabs.FD
{
    public class CombinedFDIntDTO
    {
        public FDInterestSlabDTO? FDInterestSlab { get; set; } = new();
        public List<FDInterestSlabDetailDTO>? FDInterestSlabDetails { get; set; } = new();
    }

    public class CombinedFDIntInfoDTO
    {
        public FDInterestSlabInfoDTO? FDInterestSlabInfo { get; set; } = new();
        public List<FDInterestSlabDetailDTO>? FDInterestSlabDetails { get; set; } = new();
    }

    public class FDInterestSlabDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public string SlabName { get; set; } = ""!;
        [Required]
        public int FDProductId { get; set; }
        [Required]
        public int FromDays { get; set; }
        [Required]
        public int ToDays { get; set; }
        [Required]
        public int CompoundingInterval { get; set; }
        public string ProductName { get; set; } = ""!;
    }
    public class FDInterestSlabInfoDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BranchId { get; set; }
        [Required]
        public int FDProductId { get; set; }
        [Required]
        public DateTime ApplicableDate { get; set; }
        public string ProductName { get; set; } = ""!;
    }

    public class FDInterestSlabDetailDTO
    {
        public int? Id { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required]
        public int FDIntSlabId { get; set; }
        [Required]
        public int FDIntSlabInfoId { get; set; }
        [Required]
        public decimal AgeFrom { get; set; }
        [Required]
        public decimal AgeTo { get; set; }
        [Required]
        public decimal InterestRate { get; set; }
    }
}
