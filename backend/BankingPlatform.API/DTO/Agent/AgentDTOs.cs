using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.Agent
{
    public class AgentLevelDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        [Required, MaxLength(20)]
        public string Code { get; set; } = "";
        [Required, MaxLength(150)]
        public string Description { get; set; } = "";
        public int? ParentLevelId { get; set; }
        public string? ParentLevelName { get; set; }
    }

    public class AgentMasterDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        [Required, MaxLength(20)]
        public string Code { get; set; } = "";
        [Required, MaxLength(150)]
        public string Name { get; set; } = "";
        public int? AgentLevelId { get; set; }
        public string? AgentLevelName { get; set; }
        [MaxLength(20)]
        public string Phone { get; set; } = "";
        [MaxLength(200)]
        public string Address { get; set; } = "";
        public bool IsActive { get; set; } = true;
    }

    public class AccountAgentDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int AccountId { get; set; }
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public int AccType { get; set; }
        public string AccTypeName { get; set; } = "";
        public int AgentId { get; set; }
        public string AgentName { get; set; } = "";
        public string FromDate { get; set; } = "";
        public string? ToDate { get; set; }
    }

    public class TransferAgentDTO
    {
        public int BranchId { get; set; }
        public int FromAgentId { get; set; }
        public int ToAgentId { get; set; }
        public List<int> AccountIds { get; set; } = new();
        public string EffectiveDate { get; set; } = "";
    }

    public class AgentFilterDTO
    {
        public string SearchTerm { get; set; } = "";
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
