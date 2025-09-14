using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations
{
    class MemberNomineeConfiguration
    {
        public void Configure(EntityTypeBuilder<MemberNominee> entity)
        {

            entity.HasKey(e => new { e.Id, e.BranchId })
                  .HasName("member_pkey");

            entity.Property(e => e.Id)
                  .ValueGeneratedOnAdd();

            
        }
    }
}
