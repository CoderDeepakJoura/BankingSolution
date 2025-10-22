using BankingPlatform.Infrastructure.Models.ProductMasters.Saving;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.ProductMasters.Saving
{
    public class SavingsProductInterestRule : IEntityTypeConfiguration<SavingsProductInterestRules>
    {
        public void Configure(EntityTypeBuilder<SavingsProductInterestRules> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId }).HasName("savingproductinterestrules_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }
}
