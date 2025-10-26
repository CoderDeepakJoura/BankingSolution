using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.BranchWiseRule
{
    public class FDProductBranchwieruleConfiguration: IEntityTypeConfiguration<FDProductBranchWiseRule>
    {
        public void Configure(EntityTypeBuilder<FDProductBranchWiseRule> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("fdproductbranchwiserule_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
