namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    public class UserLoginHistory
    {
        public long Id { get; set; }
        public string SocietyCode { get; set; } = string.Empty;
        public int UserId { get; set; }
        public int BranchId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public DateTime LoginTime { get; set; }
        public DateTime? LogoutTime { get; set; }
        public DateTime? LastSeen { get; set; }
        public string? LogoutType { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
    }
}
