using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.InterestSlabs.FD
{
    public class FDInterestSlabConfiguration: IEntityTypeConfiguration<FDInterestSlab>
    {
        public void Configure(EntityTypeBuilder<FDInterestSlab> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("fdinterestslab_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
