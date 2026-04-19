using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.BranchWiseRule
{
    public class RDProductBranchwiseruleConfiguration: IEntityTypeConfiguration<RDProductBranchWiseRule>
    {
        public void Configure(EntityTypeBuilder<RDProductBranchWiseRule> builder)
        {
            builder.HasKey(e => new { e.Id, e.BrId }).HasName("rdproductbranchwiserule_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
