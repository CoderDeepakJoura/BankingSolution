using BankingPlatform.Infrastructure.Models.ProductMasters.FD;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.ProductMasters.FD
{
    public class FDProducts : IEntityTypeConfiguration<FDProduct>
    {
        public void Configure(EntityTypeBuilder<FDProduct> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId }).HasName("fdproduct_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }
}
