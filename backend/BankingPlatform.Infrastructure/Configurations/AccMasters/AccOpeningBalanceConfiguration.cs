using BankingPlatform.Infrastructure.Models.AccMasters;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.AccMasters
{
    public class AccOpeningBalanceConfiguration : IEntityTypeConfiguration<AccOpeningBalance>
    {
        public void Configure(EntityTypeBuilder<AccOpeningBalance> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId }).HasName("accOpeningBalance_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.Id, e.BranchId }).IsUnique();
        }
    }
}
