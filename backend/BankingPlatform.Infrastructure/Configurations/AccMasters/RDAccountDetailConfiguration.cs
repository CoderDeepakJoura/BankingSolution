using BankingPlatform.Infrastructure.Models.AccMasters;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.AccMasters
{
    public class RDAccountDetailConfiguration: IEntityTypeConfiguration<RDAccountDetail>
    {
        public void Configure(EntityTypeBuilder<RDAccountDetail> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("RDAccountDetail_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
