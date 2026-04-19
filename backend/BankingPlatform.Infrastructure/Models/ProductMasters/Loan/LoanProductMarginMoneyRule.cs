using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Loan
{
    public class LoanProductMarginMoneyRule
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("advid")]
        public int AdvId { get; set; }

        [Column("ratioorperc")]
        public int RatioOrPerc { get; set; }

        [Column("loanproportion")]
        public double LoanProportion { get; set; }

        [Column("marginproportion")]
        public double MarginProportion { get; set; }

        [Column("mmpercentage")]
        public double MMPercentage { get; set; }
    }
}
