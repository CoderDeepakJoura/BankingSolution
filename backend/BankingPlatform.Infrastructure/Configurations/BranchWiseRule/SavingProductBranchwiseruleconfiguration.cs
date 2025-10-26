using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.BranchWiseRule
{
    public class SavingProductBranchwiseruleconfiguration: IEntityTypeConfiguration<SavingProductBranchWiseRule>
    {
        public void Configure(EntityTypeBuilder<SavingProductBranchWiseRule> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("savingproductbranchwiserule_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
