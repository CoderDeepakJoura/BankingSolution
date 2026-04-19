namespace BankingPlatform.API.DTO.ProductMasters.RD
{
    // DTOs/RDProduct/RDProductDTO.cs
    public class RDProductDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductNameInSL { get; set; } = string.Empty;
        public string ProductCode { get; set; } = string.Empty;
        public DateTime EffectiveFrom { get; set; }
    }


    // DTOs/RDProduct/RdProductRulesDTO.cs
    public class RdProductRulesDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int? ProductId { get; set; }
        public int DocumentPlan { get; set; }   // maps to DocumentPlan enum
        public int PeriodLimitMin { get; set; }
        public int PeriodLimitMax { get; set; }
    }


    // DTOs/RDProduct/RdProductPostingHeadsDTO.cs
    public class RdProductPostingHeadsDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int? ProductId { get; set; }
        public long PrincipalBalHeadCode { get; set; }
        public long IntPayableHeadCode { get; set; }
    }


    // DTOs/RDProduct/RdProductInterestRuleDetailDTO.cs
    public class RdProductInterestRuleDetailDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int? ProductId { get; set; }
        public DateTime ApplicableDate { get; set; }
        public double InterestRateFrom { get; set; }
        public double InterestRateTo { get; set; }
        public double VariationFrom { get; set; }   // IntVariationForAccLess
        public double VariationTo { get; set; }   // IntVariationForAccExceed
        public int PostingInterval { get; set; }   // maps to PostingInterval enum
        public int CompoundingInterval { get; set; }   // maps to CompoundingInterval enum
        public int ActionOnIntPosting { get; set; }   // 1=AddInBalance, 2=Stand
        public double IntRateOnPrematurity { get; set; }
        public double PostMaturityIntRate { get; set; }
        public int MinLockInPeriodDays { get; set; }
    }


    // DTOs/RDProduct/CombinedRDProductDTO.cs  (request/response wrapper)
    public class CombinedRDProductDTO
    {
        public RDProductDTO? RdProductDTO { get; set; }
        public RdProductRulesDTO? RdProductRulesDTO { get; set; }
        public RdProductPostingHeadsDTO? RdProductPostingHeadsDTO { get; set; }
        public List<RdProductInterestRuleDetailDTO> RdProductInterestRulesDetails { get; set; } = new();
    }

}
