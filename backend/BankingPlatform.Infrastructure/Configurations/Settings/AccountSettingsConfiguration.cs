using BankingPlatform.Infrastructure.Models.Settings;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Settings
{
    public class AccountSettingsConfiguration : IEntityTypeConfiguration<AccountSettings>
    {
        public void Configure(EntityTypeBuilder<AccountSettings> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("accountsettings_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }
}
