using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.GST
{
    public class TaxDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [StringLength(100)]
        public string? Name { get; set; }

        [StringLength(100)]
        public string? NameSL { get; set; }

        [StringLength(30)]
        public string? Alias { get; set; }

        [StringLength(50)]
        public string? AliasSL { get; set; }

        public DateTime IntroductionDate { get; set; } = DateTime.Today;
        public float TaxPercentage { get; set; }

        // 1=Taxable, 2=Nil Rated, 3=Exempted
        public int TCId { get; set; }

        public int? TaxGroupId { get; set; }

        // Display only
        public string? TaxCategoryName { get; set; }
        public string? TaxGroupName { get; set; }

        public List<TaxDetailDTO> Details { get; set; } = new();
    }

    public class TaxDetailDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int TaxId { get; set; }
        public DateTime DetailDate { get; set; } = DateTime.Today;
        public int TaxTypeId { get; set; }
        public float NRatio { get; set; } = 1;
        public float DRatio { get; set; } = 1;

        // 1=GrossAmount, 2=ParentTax
        public int EvaluatedOn { get; set; } = 1;
        public float Percentage { get; set; }

        // Display only
        public string? TaxTypeName { get; set; }
        public string? EvaluatedOnName { get; set; }
    }
}
