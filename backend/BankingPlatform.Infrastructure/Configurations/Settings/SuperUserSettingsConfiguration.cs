using BankingPlatform.Infrastructure.Models.Settings;

namespace BankingPlatform.Infrastructure.Configurations.Settings
{
    public class SuperUserSettingsConfiguration : IEntityTypeConfiguration<SuperUserSettings>
    {
        public void Configure(EntityTypeBuilder<SuperUserSettings> entity)
        {
            entity.ToTable("superusersettings");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("superusersettings_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }
}
