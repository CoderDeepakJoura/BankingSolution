using BankingPlatform.Infrastructure.Models.Miscalleneous;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Miscalleneous
{
    public class OccupationConfiguration: IEntityTypeConfiguration<Occupation>
    {
        public void Configure(EntityTypeBuilder<Occupation> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("occupation_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.id, e.description }).IsUnique();
        }
    }
}
