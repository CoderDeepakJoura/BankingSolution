using BankingPlatform.Infrastructure.Models.Settings;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Settings
{
    public class VoucherSettingsConfiguration: IEntityTypeConfiguration<VoucherSettings>
    {
        public void Configure(EntityTypeBuilder<VoucherSettings> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("vouchersettings_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }
}
