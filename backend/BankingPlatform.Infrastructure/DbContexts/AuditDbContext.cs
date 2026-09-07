using BankingPlatform.Infrastructure.Models.Miscalleneous;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.Infrastructure.DbContexts
{
    /// <summary>
    /// Separate EF Core context for the dedicated audit database.
    /// Audit entries are append-only; the DB-level trigger prevents UPDATE / DELETE.
    /// This context never auto-tracks changes for auditing (that would create a loop).
    /// </summary>
    public class AuditDbContext : DbContext
    {
        public AuditDbContext(DbContextOptions<AuditDbContext> options) : base(options) { }

        public DbSet<AuditLog> auditlog { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Lower-case all table and column names to match PostgreSQL conventions
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                entity.SetTableName(entity.GetTableName()!.ToLower());
                foreach (var property in entity.GetProperties())
                    property.SetColumnName(property.GetColumnName()!.ToLower());
            }

            // Map ActionType → actiontype column  (EF default would be "actiontype" after lowercasing)
            modelBuilder.Entity<AuditLog>()
                .Property(a => a.ActionType)
                .HasColumnName("actiontype");

            modelBuilder.Entity<AuditLog>()
                .Property(a => a.SocietyCode)
                .HasColumnName("societycode");
        }
    }
}
