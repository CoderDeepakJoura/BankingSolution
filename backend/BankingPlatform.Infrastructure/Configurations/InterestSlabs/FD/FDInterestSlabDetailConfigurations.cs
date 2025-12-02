using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.InterestSlabs.FD
{
    public class FDInterestSlabDetailConfigurations: IEntityTypeConfiguration<FDInterestSlabDetail>
    {
        public void Configure(EntityTypeBuilder<FDInterestSlabDetail> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("fdinterestslabdetail_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
