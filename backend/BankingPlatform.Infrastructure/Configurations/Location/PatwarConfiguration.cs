using BankingPlatform.Infrastructure.Models.Location;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Location
{
    public class PatwarConfiguration: IEntityTypeConfiguration<Patwar>
    {
        public void Configure(EntityTypeBuilder<Patwar> entity)
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("patwar_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.id, e.description }).IsUnique();
        }
    }
}
