using BankingPlatform.Infrastructure.Models.Miscalleneous;

namespace BankingPlatform.Infrastructure.Interfaces
{
    /// <summary>
    /// Minimal write-only interface for routing CUD audit entries from BankingDbContext
    /// to the separate audit database. Defined in Infrastructure so DbContext can depend
    /// on it without a circular reference back to the API project.
    /// Implemented by AuditLogService in the API project.
    /// </summary>
    public interface IAuditWriter
    {
        Task LogBulkAsync(IEnumerable<AuditLog> entries);
    }
}
