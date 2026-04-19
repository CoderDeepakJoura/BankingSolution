using BankingPlatform.API.DTO.InterestSlabs.RD;

namespace BankingPlatform.API.DTO.InterestSlabs.RD
{
    public class CombinedRDIntDTO
    {
        public RDInterestSlabDTO rdInterestSlab { get; set; } = new();
        public List<RDInterestSlabDetailDTO> rdInterestSlabDetails { get; set; } = new();
    }
    public class RDInterestSlabDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public string SlabName { get; set; } = ""!;
        [Required]
        public int RDProductId { get; set; }
        [Required]
        public DateTime ApplicableDate { get; set; }
    }

    public class RDInterestSlabDetailDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int RDIntSlabId { get; set; }       // FK to RDInterestSlab

        [Required]
        [Range(1, int.MaxValue)]
        public int SlabNo { get; set; }            // NEW – row sequence number

        [Required]
        [Range(0, 100000)]
        public decimal FromAmount { get; set; }

        [Required]
        [Range(1, 10000)]
        public decimal ToAmount { get; set; }

        [Required]
        [StringLength(20)]
        public string KistInterval { get; set; } = string.Empty; 

        [Required]
        [Range(1, 9999)]
        public int PeriodFrom { get; set; }        // NEW – months

        [Required]
        [Range(1, 9999)]
        public int PeriodTo { get; set; }          // NEW – months, must be > PeriodFrom (validated in service)

        [Required]
        [Range(0, 100)]
        public decimal InterestRate { get; set; }
    }
}
