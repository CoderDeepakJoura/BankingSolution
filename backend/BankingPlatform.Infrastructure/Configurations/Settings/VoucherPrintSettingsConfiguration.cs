using BankingPlatform.Infrastructure.Models.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BankingPlatform.Infrastructure.Configurations.Settings
{
    public class VoucherPrintSettingsConfiguration : IEntityTypeConfiguration<VoucherPrintSettings>
    {
        public void Configure(EntityTypeBuilder<VoucherPrintSettings> entity)
        {
            entity.HasKey(e => e.Id).HasName("voucherprintsettings_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.ToTable("voucherprintsettings");
            entity.HasIndex(e => new { e.BranchId, e.VoucherType, e.VoucherSubType })
                  .IsUnique()
                  .HasDatabaseName("uq_voucherprintsettings");
        }
    }
}
