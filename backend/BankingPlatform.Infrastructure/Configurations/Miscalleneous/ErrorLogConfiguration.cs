using BankingPlatform.Infrastructure.Models.Miscalleneous;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Miscalleneous
{
    public class ErrorLogConfiguration : IEntityTypeConfiguration<ErrorLog>
    {
        public void Configure(EntityTypeBuilder<ErrorLog> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("error_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}
