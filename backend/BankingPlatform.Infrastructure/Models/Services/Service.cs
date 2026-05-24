using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Services
{
    public class ServiceMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int BrId { get; set; }

        [MaxLength(100)]
        public string? Name { get; set; }

        [MaxLength(20)]
        public string? SAC { get; set; }

        public decimal OtherReceipts { get; set; }

        public decimal DeductRefunds { get; set; }

        public decimal Penalties { get; set; }

        public bool IsIncludeTax { get; set; }

        public int PurchaseAccId { get; set; }
    }

    public class ServiceTaxRule
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int BrId { get; set; }

        public int ServiceId { get; set; }

        [Column(TypeName = "timestamp")]
        public DateTime ApplicableDate { get; set; }

        public int TaxId { get; set; }
    }

    public class ServiceTaxTypeDet
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int BrId { get; set; }

        public int ServiceId { get; set; }

        [Column(TypeName = "timestamp")]
        public DateTime Date { get; set; }

        public int TaxTypeId { get; set; }

        public decimal Perc { get; set; }
    }
}
