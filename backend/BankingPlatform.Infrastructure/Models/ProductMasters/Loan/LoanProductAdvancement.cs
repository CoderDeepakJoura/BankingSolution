using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Loan
{
    public class LoanProductAdvancement
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("productid")]
        public int ProductId { get; set; }

        [Required]
        [Column("disbursmentmode")]
        [StringLength(50)]
        public string DisbursmentMode { get; set; } = string.Empty;

        [Column("maxnoofdisbursments")]
        public int MaxNoofDisbursments { get; set; }

        [Column("minloanamount", TypeName = "numeric(24,2)")]
        public decimal MinLoanAmount { get; set; }

        [Column("maxloanamount", TypeName = "numeric(24,2)")]
        public decimal MaxLoanAmount { get; set; }

        [Required]
        [Column("issharemoneyreq")]
        [StringLength(2)]
        public string IsShareMoneyReq { get; set; } = "N";

        [Column("loanperiodtype")]
        [StringLength(2)]
        public string? LoanPeriodType { get; set; }

        [Column("overdraftlimit")]
        public short OverDraftLimit { get; set; } = 0;

        [Column("loanamtperonsecurityrd", TypeName = "numeric(24,2)")]
        public decimal? LoanAmtPerOnSecurityRD { get; set; }

        [Column("loanamtperonsecurityfd", TypeName = "numeric(24,2)")]
        public decimal? LoanAmtPerOnSecurityFD { get; set; }
    }
}
