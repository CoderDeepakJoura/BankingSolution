using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.GST
{
    public class StockMain
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int BrId { get; set; }
        public DateTime Date { get; set; }
        public int? VmId { get; set; }
        public string? Narration { get; set; }
        public int TaxGroupId { get; set; }
        public short? IsRC { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal? RoundAmount { get; set; }
        public int? TransTypeId { get; set; }
    }

    public class StockBillBookDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int StockMainId { get; set; }
        public int BillBookId { get; set; }
        public int BillNo { get; set; }
        public DateTime Date { get; set; }
        public int DrAccId { get; set; }
    }

    public class SMDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int StateId { get; set; }
        public int SupplyTypeId { get; set; }
        public int StockMainId { get; set; }
        public string? GstINo { get; set; }
        public int? FkId { get; set; }
        public int FkBrId { get; set; }
        public int? FkTypeId { get; set; }
    }

    public class GSTServiceDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int StockMainId { get; set; }
        public int ServiceId { get; set; }
        public int TaxId { get; set; }
        public decimal Amount { get; set; }
        public decimal NetAmount { get; set; }
        public DateTime Date { get; set; }
    }

    public class StockTaxDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int StockMainId { get; set; }
        public int TaxTypeId { get; set; }
        public decimal TaxPerc { get; set; }
        public decimal TaxAmt { get; set; }
    }

    public class NextBillNumber
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int BrSessId { get; set; }
        public int FkId { get; set; }
        public int NextBillNo { get; set; }
        public int FkType { get; set; }
    }
}
