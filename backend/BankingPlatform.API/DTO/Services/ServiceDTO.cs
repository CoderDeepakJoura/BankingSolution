namespace BankingPlatform.API.DTO.Services
{
    public class ServiceTaxRuleDTO
    {
        public int Id { get; set; }
        public string ApplicableDate { get; set; } = "";
        public int TaxId { get; set; }
        public string? TaxName { get; set; }
    }

    public class ServiceTaxTypeDetDTO
    {
        public int Id { get; set; }
        public string Date { get; set; } = "";
        public int TaxTypeId { get; set; }
        public string? TaxTypeName { get; set; }
        public decimal Perc { get; set; }
    }

    public class ServiceDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string? Name { get; set; }
        public string? SAC { get; set; }
        public decimal OtherReceipts { get; set; }
        public decimal DeductRefunds { get; set; }
        public decimal Penalties { get; set; }
        public bool IsIncludeTax { get; set; }
        public int PurchaseAccId { get; set; }
        public string? PurchaseAccDisplay { get; set; }
        public List<ServiceTaxRuleDTO> TaxRules { get; set; } = new();
        public List<ServiceTaxTypeDetDTO> TaxTypeDets { get; set; } = new();
    }
}
