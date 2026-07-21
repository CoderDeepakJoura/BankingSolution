using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.voucher
{
    public class LoanExpense
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int BrId { get; set; }
        public DateTime Date { get; set; }
        public int LoanProductId { get; set; }
        public int DrAccountId { get; set; }
        public int ExpenseCategoryId { get; set; }
        public decimal ExpenseAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal NetAmount { get; set; }
        public string? Remarks { get; set; }
        public int CrAccountTypeId { get; set; }
        public int CrAccountId { get; set; }
        public int? StockMainId { get; set; }
        public int? VoucherId { get; set; }
        public int VoucherNo { get; set; }
        public int AddedBy { get; set; }
    }
}
