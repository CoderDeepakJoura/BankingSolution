using BankingPlatform.Infrastructure.Models.Settings;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Settings
{
    public class GeneralSettingsConfiguration: IEntityTypeConfiguration<GeneralSettings>
    {
        public void Configure(EntityTypeBuilder<GeneralSettings> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("generalsettings_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }
}
