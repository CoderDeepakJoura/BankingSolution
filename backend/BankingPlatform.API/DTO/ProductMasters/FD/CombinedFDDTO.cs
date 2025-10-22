namespace BankingPlatform.API.DTO.ProductMasters.FD
{
    public class CombinedFDDTO
    {
        public FdProductDTO? fdProductDTO { get; set; }
        public FdProductRulesDTO? fdProductRulesDTO { get; set; }
        public FdProductPostingHeadsDTO? fdProductPostingHeadsDTO { get; set; }
        public FdProductInterestRulesDTO? fdProductInterestRulesDTO { get; set; }
    }
    public class FdProductDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [Required]
        public string ProductName { get; set; } = string.Empty;

        [Required]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTill { get; set; }

        public bool? IsSeparateFdAccountAllowed { get; set; }

    }

    /// <summary>
    /// DTO for FD Product Rules.
    /// </summary>
    public class FdProductRulesDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int ProductId { get; set; } = 0;

        public int IntAccountType { get; set; }
        public int? FdMaturityReminderInMonths { get; set; }
        public int? FdMaturityReminderInDays { get; set; }
    }

    /// <summary>
    /// DTO for FD Product Posting Heads.
    /// </summary>
    public class FdProductPostingHeadsDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [Required]
        public long PrincipalBalHeadCode { get; set; }

        [Required]
        public long SuspendedBalHeadCode { get; set; }

        [Required]
        public long IntPayableHeadCode { get; set; }
    }

    /// <summary>
    /// DTO for FD Product Interest Rules.
    /// </summary>
    public class FdProductInterestRulesDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [Required]
        public DateTime ApplicableDate { get; set; }

        public int InterestApplicableOn { get; set; }
        public int InterestRateMinValue { get; set; }
        public int InterestRateMaxValue { get; set; }
        public int InterestVariationMinValue { get; set; }
        public int InterestVariationMaxValue { get; set; }
        public short ActionOnIntPosting { get; set; }
        public short PostMaturityIntRateCalculationType { get; set; }
        public short PrematurityCalculationType { get; set; }
        public int MaturityDueNoticeInDays { get; set; }
        public int IntPostingInterval { get; set; }
        public int IntPostingDate { get; set; }
    }
}
