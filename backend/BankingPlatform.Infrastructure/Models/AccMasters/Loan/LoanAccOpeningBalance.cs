using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.AccMasters.Loan
{
    public class LoanAccOpeningBalance
    {
        [Key]
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int? AccId { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal? TotalBalance { get; set; }
        [MaxLength(2)]
        public string? BalType { get; set; }
        [Column(TypeName = "numeric(24,0)")]
        public decimal? OverDueBal { get; set; }
        [MaxLength(2)]
        public string? OverBalType { get; set; }
        [Column(TypeName = "numeric(24,0)")]
        public decimal? OpenInt { get; set; }
        [MaxLength(2)]
        public string? OpenIntType { get; set; }
        [Column(TypeName = "numeric(24,0)")]
        public decimal? OpenOverInt { get; set; }
        [MaxLength(2)]
        public string? OpenOverIntType { get; set; }
        public long? HeadCode { get; set; }
        public DateTime? OverDueDate { get; set; }
    }

    public class LoanAccountBalanceDetail
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int LoanOpenBalId { get; set; }
        public int AccountId { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal AmountDr { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal AmountCr { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal IntDr { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal IntCr { get; set; }
        public DateTime Date { get; set; }
        public DateTime ValueDate { get; set; }
        [MaxLength(5)]
        public string? Status { get; set; }
        public long? HeadCode { get; set; }
    }

    public class LoanAccountRecoveryInterest
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int BalDetailId { get; set; }
        public int IntCategoryId { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal AmountDr { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal AmountCr { get; set; }
        public int AccId { get; set; }
        public DateTime? EntryDate { get; set; }
        public DateTime? ValueDate { get; set; }
    }
}