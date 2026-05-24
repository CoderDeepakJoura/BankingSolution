using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.GST
{
    public class TaxGroupDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [StringLength(50)]
        public string? Description { get; set; }

        [StringLength(50)]
        public string? DescriptionSL { get; set; }

        [StringLength(10)]
        public string? Code { get; set; }

        public int? PrintingFormat { get; set; }
        public bool IsStateMandatory { get; set; }
        public bool IsShippingMandatory { get; set; }
        public bool IsBillingMandatory { get; set; }

        // IDs of selected tax types (used on create/update)
        public List<int> SelectedTaxTypeIds { get; set; } = new();

        // Populated on fetch for display
        public List<TaxGroupTypeRowDTO> TaxGroupTypes { get; set; } = new();
    }

    public class TaxGroupTypeRowDTO
    {
        public int TaxTypeId { get; set; }
        public string? Name { get; set; }
        public string? Code { get; set; }
        public int? AppliedIn { get; set; }
        public int CalculatedFrom { get; set; }
    }
}
