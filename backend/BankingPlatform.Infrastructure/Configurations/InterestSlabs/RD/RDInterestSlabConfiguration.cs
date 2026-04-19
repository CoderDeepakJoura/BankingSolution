using BankingPlatform.Infrastructure.Models.InterestSlabs.RD;
using BankingPlatform.Infrastructure.Models.InterestSlabs.RD;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.InterestSlabs.RD
{
    public class RDInterestSlabConfiguration : IEntityTypeConfiguration<RDInterestSlab>
    {
        public void Configure(EntityTypeBuilder<RDInterestSlab> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("rdinterestslab_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
    public class RDInterestSlabDetailConfigurations : IEntityTypeConfiguration<RDInterestSlabDetail>
    {
        public void Configure(EntityTypeBuilder<RDInterestSlabDetail> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("rdinterestslabdetail_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
