using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations
{
    public class VillageConfiguration: IEntityTypeConfiguration<Village> 
    {
        public void Configure(EntityTypeBuilder<Village> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("village_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.id, e.villagename }).IsUnique();
        }
    }
}
