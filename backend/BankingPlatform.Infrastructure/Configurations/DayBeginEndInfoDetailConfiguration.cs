using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations
{
    internal class DayBeginEndInfoDetailConfiguration : IEntityTypeConfiguration<DayBeginEndInfoDetail>
    {
        public void Configure(EntityTypeBuilder<DayBeginEndInfoDetail> entity)
        {

            entity.HasKey(e => new { e.id, e.branchid })
                  .HasName("DayBeginEndInfoDetail_pkey");

            entity.Property(e => e.id)
                  .ValueGeneratedOnAdd();

            entity.HasIndex(e => new { e.id, e.branchid })
                  .IsUnique();

            entity
                .HasOne(d => d.DayBeginEndInfo)
                .WithMany(p => p.Details)
                .HasForeignKey(d => new { d.daybeginendinfoid, d.branchid })
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
