namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    public class AuditLog
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;

        /// <summary>CREATE | UPDATE | DELETE</summary>
        public string Action { get; set; } = string.Empty;

        /// <summary>High-level category derived from the entity's namespace (e.g. "Member", "Voucher")</summary>
        public string Module { get; set; } = string.Empty;

        /// <summary>C# entity class name (maps to the DB table)</summary>
        public string EntityName { get; set; } = string.Empty;

        /// <summary>Primary key of the affected row, serialised as "col:value, col:value"</summary>
        public string? EntityId { get; set; }

        /// <summary>JSON snapshot of the row BEFORE the change (null for CREATE)</summary>
        public string? OldValue { get; set; }

        /// <summary>JSON snapshot of the row AFTER the change (null for DELETE)</summary>
        public string? NewValue { get; set; }

        public string? IpAddress { get; set; }
        public string? WorkingDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}