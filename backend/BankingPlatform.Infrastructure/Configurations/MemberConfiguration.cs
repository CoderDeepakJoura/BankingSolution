using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations
{
    public class MemberConfiguration
    {
        public void Configure(EntityTypeBuilder<Member> entity)
        {

            entity.HasKey(e => new { e.Id, e.MemberBranchId })
                  .HasName("member_pkey");

            entity.Property(e => e.Id)
                  .ValueGeneratedOnAdd();

        }
    }
}
