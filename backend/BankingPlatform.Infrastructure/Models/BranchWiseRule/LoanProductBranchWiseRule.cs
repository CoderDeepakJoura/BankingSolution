using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.BranchWiseRule
{
    [Table("loanproductbranchwiserule")]
    public class LoanProductBranchWiseRule
    {
        [Column("id")]
        public int Id { get; set; }

        [Column("branchid")]
        [Required]
        public int BranchId { get; set; }

        [Column("loanproductid")]
        [Required]
        public int LoanProductId { get; set; }

        [Column("mclplanid")]
        public int? MCLPlanId { get; set; }

        [Column("npaplanid")]
        public int? NPAPlanId { get; set; }

        [Column("legalplanid")]
        public int? LegalPlanId { get; set; }

        [Column("operatedby")]
        [MaxLength(2)]
        public string? OperatedBy { get; set; }

        [Column("accnoornamefirst")]
        [MaxLength(2)]
        public string? AccNoOrNameFirst { get; set; }

        [Column("temprecaccid")]
        public int? TempRecAccId { get; set; }

        [Column("currentrecoverableintacc")]
        public int? CurrentRecoverableIntAcc { get; set; }

        [Column("intincomeacc")]
        public int? IntIncomeAcc { get; set; }

        [Column("overduerecoverableintacc")]
        public int? OverdueRecoverableIntAcc { get; set; }

        [Column("isapplyoverint")]
        public short IsApplyOverInt { get; set; } = 0;

        [Column("ovrintprovacc")]
        public int OVRIntProvAcc { get; set; } = 0;

        [Column("intwrtdepositpledge")]
        public int? IntwrtDepositPledge { get; set; }

        [Column("ovrintfromopendate")]
        public short OVRIntFromOpendate { get; set; } = 0;

        [Column("actonexpposting")]
        public int? ActOnExpPosting { get; set; }
    }
}
