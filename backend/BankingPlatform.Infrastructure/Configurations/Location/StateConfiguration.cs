using BankingPlatform.Infrastructure.Models.Location;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Location
{
    public class StateConfiguration : IEntityTypeConfiguration<State>
    {
        public void Configure(EntityTypeBuilder<State> entity)
        {
            entity.HasKey(e => new { e.id });
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }
}
