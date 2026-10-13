using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    [Table("ibvoucherexpensedetail")]
    public class IBVoucherExpenseDetail
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("ibvoucherid")]
        public int IBVoucherId { get; set; }

        [Column("loanproductid")]
        public int LoanProductId { get; set; }

        [Column("expensecategoryid")]
        public int ExpenseCategoryId { get; set; }

        [Column("expenseamount", TypeName = "numeric(18,2)")]
        public decimal ExpenseAmount { get; set; }

        [Column("totaltax", TypeName = "numeric(18,2)")]
        public decimal TotalTax { get; set; }

        [Column("netamount", TypeName = "numeric(18,2)")]
        public decimal NetAmount { get; set; }

        [Column("remarks")]
        [MaxLength(300)]
        public string? Remarks { get; set; }

        [Column("craccounttypeid")]
        public int CrAccountTypeId { get; set; }
    }
}
