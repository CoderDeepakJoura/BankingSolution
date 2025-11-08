using BankingPlatform.Infrastructure.Models.InterestSlabs.Saving;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.InterestSlabs.Saving
{
    public class SavingInterestSlabConfigurations : IEntityTypeConfiguration<SavingInterestSlab>
    {
        public void Configure(EntityTypeBuilder<SavingInterestSlab> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("savinginterestslab_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
