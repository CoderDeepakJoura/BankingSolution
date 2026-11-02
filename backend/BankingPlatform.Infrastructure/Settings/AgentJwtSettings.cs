namespace BankingPlatform.Infrastructure.Settings
{
    public class AgentJwtSettings
    {
        public string SecretKey { get; set; } = "";
        public string Issuer { get; set; } = "AgentAPI";
        public string Audience { get; set; } = "AgentClients";
        public int AccessTokenExpiryMinutes { get; set; } = 480; // 8 hours (full work day)
        public int RefreshTokenExpiryDays { get; set; } = 30;
    }
}
