using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations
{
    public class AccountMasterConfiguration : IEntityTypeConfiguration<AccountMaster>
    {
        public void Configure(EntityTypeBuilder<AccountMaster> entity)
        {
            entity.HasKey(e => new { e.ID, e.BranchId }).HasName("AccountMaster_pkey");
            entity.Property(e => e.ID).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.ID, e.BranchId }).IsUnique();
        }
    }
}
