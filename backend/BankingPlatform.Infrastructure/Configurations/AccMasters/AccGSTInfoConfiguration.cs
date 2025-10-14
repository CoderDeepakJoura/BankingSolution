using BankingPlatform.Infrastructure.Models.AccMasters;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.AccMasters
{
    public class AccGSTInfoConfiguration : IEntityTypeConfiguration<GSTInfo>
    {
        public void Configure(EntityTypeBuilder<GSTInfo> entity)
        {
            entity.HasKey(e => new { e.ID, e.BranchId }).HasName("AccGSTInfo_pkey");
            entity.Property(e => e.ID).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.ID, e.BranchId }).IsUnique();
        }
    }
}
