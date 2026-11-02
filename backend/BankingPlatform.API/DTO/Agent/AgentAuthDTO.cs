namespace BankingPlatform.API.DTO.Agent
{
    public class AgentLoginRequestDTO
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class AgentTokenResponseDTO
    {
        public string AccessToken { get; set; } = "";
        public string RefreshToken { get; set; } = "";
        public DateTime ExpiresAt { get; set; }
        public int AgentId { get; set; }
        public int AgentMasterId { get; set; }
        public int BranchId { get; set; }
        public string AgentName { get; set; } = "";
        public string BranchName { get; set; } = "";
        public bool IsSuperAgent { get; set; }
    }

    public class AgentRefreshRequestDTO
    {
        public string RefreshToken { get; set; } = "";
    }
}
