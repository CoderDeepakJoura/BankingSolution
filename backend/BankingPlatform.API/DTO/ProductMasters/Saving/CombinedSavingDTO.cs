namespace BankingPlatform.API.DTO.ProductMasters.Saving
{
    public class CombinedSavingDTO
    {
        public SavingsProductDTO? SavingsProductDTO { get; set; }
        public SavingsProductRulesDTO? SavingsProductRulesDTO { get; set; }
        public SavingsProductPostingHeadsDTO? SavingsProductPostingHeadsDTO { get; set; }
        public SavingsProductInterestRulesDTO? SavingsProductInterestRulesDTO { get; set; }
    }
    public class SavingsProductDTO
    {
        public int? Id { get; set; }

        [Required(ErrorMessage = "Branch ID is required")]
        public int BranchId { get; set; }

        [Required(ErrorMessage = "Product Name is required")]
        [StringLength(255, MinimumLength = 2, ErrorMessage = "Product Name must be between 2 and 255 characters")]
        public string ProductName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Product Code is required")]
        [StringLength(10, MinimumLength = 1, ErrorMessage = "Product Code must be between 1 and 10 characters")]
        [RegularExpression(@"^[A-Z0-9]+$", ErrorMessage = "Product Code must contain only uppercase letters and numbers")]
        public string ProductCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Effective From date is required")]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTill { get; set; }
        public bool IsNomineeMandatoryInAccMasters { get; set; }
    }
    public class SavingsProductRulesDTO
    {
        public int? Id { get; set; }

        [Required(ErrorMessage = "Branch ID is required")]
        public int BranchId { get; set; }

        public int? SavingsProductId { get; set; }

        [Required(ErrorMessage = "A/c Statement Frequency is required")]
        [Range(1, 5, ErrorMessage = "A/c Statement Frequency must be between 1 and 5")]
        public int AcStatementFrequency { get; set; }

        [Required(ErrorMessage = "A/c Retention Days is required")]
        [Range(0, 3650, ErrorMessage = "A/c Retention Days must be between 0 and 3650")]
        public int AcRetentionDays { get; set; }

        [Required(ErrorMessage = "Minimum Balance Amount is required")]
        [Range(0, double.MaxValue, ErrorMessage = "Minimum Balance Amount must be greater than or equal to 0")]
        public decimal MinBalanceAmt { get; set; }
    }
    public class SavingsProductPostingHeadsDTO
    {
        public int? Id { get; set; }

        [Required(ErrorMessage = "Branch ID is required")]
        public int BranchId { get; set; }

        public int? SavingsProductId { get; set; }

        [Required(ErrorMessage = "Principal Balance Head is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Please select a valid Principal Balance Head")]
        public int PrincipalBalHeadCode { get; set; }

        [Required(ErrorMessage = "Suspended Balance Head is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Please select a valid Suspended Balance Head")]
        public int SuspendedBalHeadCode { get; set; }

        [Required(ErrorMessage = "Interest Payable Head is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Please select a valid Interest Payable Head")]
        public int IntPayableHeadCode { get; set; }
    }
    public class SavingsProductInterestRulesDTO
    {
        public int? Id { get; set; }

        [Required(ErrorMessage = "Branch ID is required")]
        public int BranchId { get; set; }

        public int? SavingsProductId { get; set; }

        [Required(ErrorMessage = "Applicable Date is required")]
        public DateTime ApplicableDate { get; set; }

        [Required(ErrorMessage = "Rate Applied Method is required")]
        [Range(1, 3, ErrorMessage = "Please select a valid Rate Applied Method")]
        public int RateAppliedMethod { get; set; }

        [Required(ErrorMessage = "Int. Applicable Date is required")]
        public DateTime IntApplicableDate { get; set; }

        [Required(ErrorMessage = "Calculation Method is required")]
        [Range(1, 2, ErrorMessage = "Please select a valid Calculation Method")]
        public int CalculationMethod { get; set; }

        [Required(ErrorMessage = "Minimum Interest Rate is required")]
        [Range(0.01, 100, ErrorMessage = "Interest rate must be between 0.01% and 100%")]
        public decimal InterestRateMinValue { get; set; }

        [Required(ErrorMessage = "Maximum Interest Rate is required")]
        [Range(0.01, 100, ErrorMessage = "Interest rate must be between 0.01% and 100%")]
        public decimal InterestRateMaxValue { get; set; }

        [Required(ErrorMessage = "Minimum Interest Variation is required")]
        [Range(-100, 100, ErrorMessage = "Interest variation must be between -100% and +100%")]
        public decimal InterestVariationMinValue { get; set; }

        [Required(ErrorMessage = "Maximum Interest Variation is required")]
        [Range(-100, 100, ErrorMessage = "Interest variation must be between -100% and +100%")]
        public decimal InterestVariationMaxValue { get; set; }

        [Required(ErrorMessage = "Minimum Posting Interest Amount is required")]
        [Range(0, double.MaxValue, ErrorMessage = "Minimum posting interest must be 0 or greater")]
        public decimal MinPostingIntAmt { get; set; }

        [Required(ErrorMessage = "Minimum Balance For Posting is required")]
        [Range(0, double.MaxValue, ErrorMessage = "Minimum balance for posting must be 0 or greater")]
        public decimal MinBalForPosting { get; set; }

        [Required(ErrorMessage = "Interest Posting Interval is required")]
        [Range(1, 5, ErrorMessage = "Please select a valid posting interval")]
        public int IntPostingInterval { get; set; }

        [Required(ErrorMessage = "Interest Posting Date is required")]
        [Range(1, 2, ErrorMessage = "Please select a valid posting date type")]
        public int IntPostingDate { get; set; }

        [Required(ErrorMessage = "Compound Interval is required")]
        [Range(1, 5, ErrorMessage = "Please select a valid compound interval")]
        public int CompoundInterval { get; set; }

        [Required(ErrorMessage = "Interest Compound Date is required")]
        [Range(1, 2, ErrorMessage = "Please select a valid compound date type")]
        public int IntCompoundDate { get; set; }

        [Required(ErrorMessage = "Action on Interest Posting is required")]
        [Range(1, 2, ErrorMessage = "Please select a valid action for interest posting")]
        public int ActionOnIntPosting { get; set; }
    }

}
