namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    /// <summary>
    /// Immutable audit trail entry written to the dedicated audit database.
    /// Never modify or delete rows — the DB-level trigger enforces immutability.
    /// </summary>
    public class AuditLog
    {
        public long Id { get; set; }

        /// <summary>
        /// Identifies which society this entry belongs to.
        /// Matches the society's banking database name / identifier.
        /// </summary>
        public string SocietyCode { get; set; } = string.Empty;

        public int BranchId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;

        /// <summary>
        /// Broad action vocabulary:
        /// LOGIN | LOGOUT | OPEN | VIEW | SEARCH | CREATE | UPDATE | DELETE | EXPORT | PRINT
        /// </summary>
        public string ActionType { get; set; } = string.Empty;

        /// <summary>High-level category (Member, Voucher, Account Master, …)</summary>
        public string Module { get; set; } = string.Empty;

        /// <summary>UI screen the user was on (e.g. "Saving Deposit", "Member Master")</summary>
        public string? Screen { get; set; }

        /// <summary>C# entity class name / DB table (e.g. "Member", "Voucher")</summary>
        public string? EntityName { get; set; }

        /// <summary>Primary key of the affected row, serialised as "col:value, col:value"</summary>
        public string? EntityId { get; set; }

        /// <summary>Human-readable summary (e.g. "Opened member #123 — Rajesh Kumar")</summary>
        public string? Description { get; set; }

        /// <summary>JSON snapshot of the row BEFORE the change (null for CREATE / VIEW)</summary>
        public string? OldValue { get; set; }

        /// <summary>JSON snapshot of the row AFTER the change (null for DELETE / VIEW)</summary>
        public string? NewValue { get; set; }

        public string? IpAddress { get; set; }
        public string? WorkingDate { get; set; }

        /// <summary>JWT session identifier — ties all actions in one login together</summary>
        public string? SessionId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }

    /// <summary>
    /// Well-known action type constants — use these instead of raw strings.
    /// </summary>
    public static class AuditActionType
    {
        public const string Login   = "LOGIN";
        public const string Logout  = "LOGOUT";
        public const string Open    = "OPEN";
        public const string View    = "VIEW";
        public const string Search  = "SEARCH";
        public const string Create  = "CREATE";
        public const string Update  = "UPDATE";
        public const string Delete  = "DELETE";
        public const string Export  = "EXPORT";
        public const string Print   = "PRINT";
    }
}
