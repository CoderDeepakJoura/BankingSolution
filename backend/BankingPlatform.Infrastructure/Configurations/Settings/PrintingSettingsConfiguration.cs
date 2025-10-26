using BankingPlatform.Infrastructure.Models.Settings;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Settings
{
    public class PrintingSettingsConfiguration : IEntityTypeConfiguration<PrintingSettings>
    {
        public void Configure(EntityTypeBuilder<PrintingSettings> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("printingsettings_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }
}
