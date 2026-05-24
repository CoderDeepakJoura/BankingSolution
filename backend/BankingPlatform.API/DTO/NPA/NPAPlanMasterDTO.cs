using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.NPA
{
    public class NPAPlanMasterDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        public int CalNPADate { get; set; } = 0;
        public int OvrDuePeriodOrInst { get; set; } = 1;
        public short CalNPAFromLoanDate { get; set; } = 0;
    }

    public class NPAPlanMasterListItemDTO
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
