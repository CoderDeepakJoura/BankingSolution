using BankingPlatform.Infrastructure.Models.Settings;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Settings
{
    public class TDSSettingsConfiguration : IEntityTypeConfiguration<TDSSettings>
    {
        public void Configure(EntityTypeBuilder<TDSSettings> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("tdssettings_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }
}
