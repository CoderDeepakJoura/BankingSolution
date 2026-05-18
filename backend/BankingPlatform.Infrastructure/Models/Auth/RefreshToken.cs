namespace BankingPlatform.Infrastructure.Models.Auth
{
    public class RefreshToken
    {
        public int Id { get; set; }
        public string Token { get; set; } = null!;
        public int UserId { get; set; }
        public int BranchId { get; set; }
        public string ClaimsSnapshot { get; set; } = null!; // JSON of session claims for rotation
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ReplacedByToken { get; set; } // audit trail for token rotation
    }
}