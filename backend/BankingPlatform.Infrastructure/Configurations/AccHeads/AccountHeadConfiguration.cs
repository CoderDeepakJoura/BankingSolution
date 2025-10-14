using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using BankingPlatform.Infrastructure.Models.AccHeads;
namespace BankingPlatform.Infrastructure.Configurations.AccHeads
{
    public class AccountHeadConfiguration : IEntityTypeConfiguration<AccountHead>
    {
        public void Configure(EntityTypeBuilder<AccountHead> entity)
        {

            entity.HasKey(e => new { e.id, e.branchid })
                  .HasName("accounthead_pkey");

            entity.Property(e => e.id)
                  .ValueGeneratedOnAdd();

            entity.HasIndex(e => new { e.id, e.branchid })
                  .IsUnique();
        }
    }
}
