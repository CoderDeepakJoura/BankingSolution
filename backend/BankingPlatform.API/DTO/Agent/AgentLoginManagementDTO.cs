namespace BankingPlatform.API.DTO.Agent
{
    public class AgentLoginListDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int AgentMasterId { get; set; }
        public string AgentName { get; set; } = "";
        public string AgentCode { get; set; } = "";
        public string Username { get; set; } = "";
        public bool IsSuperAgent { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateAgentLoginDTO
    {
        public int BranchId { get; set; }
        public int AgentMasterId { get; set; }
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public bool IsSuperAgent { get; set; } = false;
    }

    public class ResetAgentPasswordDTO
    {
        public int AgentLoginId { get; set; }
        public int BranchId { get; set; }
        public string NewPassword { get; set; } = "";
    }

    public class ToggleAgentLoginDTO
    {
        public int AgentLoginId { get; set; }
        public int BranchId { get; set; }
        public bool IsActive { get; set; }
    }
}
