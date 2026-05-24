using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.NPA
{
    public class NPAPlanCategoryDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        public int? ParentId { get; set; }
        public string? IsGroup { get; set; }
        public int? PlanId { get; set; }
        public int? PeriodFrom { get; set; }
        public int? PeriodTo { get; set; }
        public double? ProvisioningPerc { get; set; }
        public int? IntMaxPeriod { get; set; }

        [StringLength(100)]
        public string? Description { get; set; }

        [StringLength(100)]
        public string? DescriptionSL { get; set; }

        public int? SeqNo { get; set; }
        public short AllPrinOverdue { get; set; } = 0;

        // Read-only display fields
        public string? PlanCode { get; set; }
        public string? ParentDescription { get; set; }
    }
}
