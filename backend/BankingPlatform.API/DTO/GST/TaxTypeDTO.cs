using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.GST
{
    public class TaxTypeDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [StringLength(50)]
        public string? Description { get; set; }

        [StringLength(100)]
        public string? DescriptionSL { get; set; }

        [StringLength(10)]
        public string? Code { get; set; }

        public int? AppliedIn { get; set; }
        public short? IsUT { get; set; }
        public int CalculatedFrom { get; set; } = 1;
        public int SeqNo { get; set; } = 1;
        public int InAccId { get; set; }
        public int OutAccId { get; set; }

        // Display only (populated on fetch)
        public string? InAccDisplay { get; set; }
        public string? OutAccDisplay { get; set; }
    }

    public class AccountLookupDTO
    {
        public int Id { get; set; }
        public string? AccountNumber { get; set; }
        public string? AccountName { get; set; }
        public string Display => $"{AccountNumber} - {AccountName}";
    }
}
