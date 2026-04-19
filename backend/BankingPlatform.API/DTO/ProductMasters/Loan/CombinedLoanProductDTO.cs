using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.ProductMasters.Loan
{
    public class CombinedLoanProductDTO
    {
        public LoanProductDTO? LoanProductDTO { get; set; }
        public LoanProductDefinitionDTO? LoanProductDefinitionDTO { get; set; }
        public LoanProductAdvancementDTO? LoanProductAdvancementDTO { get; set; }
        public LoanProductMarginMoneyRuleDTO? LoanProductMarginMoneyRuleDTO { get; set; }
        public LoanProductPostingDTO? LoanProductPostingDTO { get; set; }
        public LoanProductRecoveryDTO? LoanProductRecoveryDTO { get; set; }
    }

    public class LoanProductDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [Required]
        [StringLength(3)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ProductName { get; set; } = string.Empty;

        [StringLength(75)]
        public string? NameSL { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }
    }

    public class LoanProductDefinitionDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int ProductId { get; set; }

        [Required]
        public int TypeId { get; set; }

        public int? CategoryId { get; set; }

        [Required]
        public string SecurityIds { get; set; } = string.Empty;

        [Required]
        public int SecReviewFreqPeriod { get; set; }

        public int? DocPlanId { get; set; }

        public int? IntSchedule { get; set; }

        public int? IntFormulae { get; set; }

        public int? ActOnIntPosting { get; set; }
    }

    public class LoanProductAdvancementDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int ProductId { get; set; }

        [Required]
        public string DisbursmentMode { get; set; } = string.Empty;

        [Required]
        public int MaxNoofDisbursments { get; set; }

        [Required]
        public decimal MinLoanAmount { get; set; }

        [Required]
        public decimal MaxLoanAmount { get; set; }

        [Required]
        public string IsShareMoneyReq { get; set; } = "N";

        public string? LoanPeriodType { get; set; }

        public short OverDraftLimit { get; set; } = 0;

        public decimal? LoanAmtPerOnSecurityRD { get; set; }

        public decimal? LoanAmtPerOnSecurityFD { get; set; }
    }

    public class LoanProductMarginMoneyRuleDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int AdvId { get; set; }

        public int RatioOrPerc { get; set; }
        public double LoanProportion { get; set; }
        public double MarginProportion { get; set; }
        public double MMPercentage { get; set; }
    }

    public class LoanProductPostingDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int ProductId { get; set; }

        [Required]
        public long PrincipalBalHeadCode { get; set; }

        [Required]
        public long MiscIncHeadCode { get; set; }

        public long MinBalLeftLimitHeadCode { get; set; }
        public long MinBalGivenLimitHeadCode { get; set; }

        [Required]
        public long ExpHeadCode { get; set; }

        public long? RecoverableIntHeadCode { get; set; }
    }

    public class LoanProductRecoveryDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int ProductId { get; set; }

        [Required]
        public string RecoveryMode { get; set; } = string.Empty;

        public double MinBalLeftLimit { get; set; }
        public double MinBalGivenLimit { get; set; }

        // Recovery sequence priorities (stored as CSV in RecoverySeq)
        public int OverDueInterestSeq { get; set; } = 1;
        public int StandardInterestSeq { get; set; } = 2;
        public int OverDueBalanceSeq { get; set; } = 3;
        public int StandardBalanceSeq { get; set; } = 4;

        public string? ApplyOvrIntOn { get; set; }

        public short IntRecoveredInAdvance { get; set; } = 0;

        public int IntPostingInterval { get; set; }

        public short StdOverdueOnKistDate { get; set; } = 0;

        public int RecoveryAdjustmentSeq { get; set; } = 1;
    }
}
