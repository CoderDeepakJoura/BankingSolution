using BankingPlatform.Infrastructure.Models.BranchSessions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.BranchSessionConfig
{
    public class BranchSessionConfiguration: IEntityTypeConfiguration<BranchSession>
    {
        public void Configure(EntityTypeBuilder<BranchSession> builder)
        {
            builder.HasKey(e => new { e.id, e.branchid }).HasName("branchsession_pkey");
            builder.Property(e => e.id).ValueGeneratedOnAdd();
            builder.HasIndex(e => new { e.id, e.branchid }).IsUnique();
        }
    }
}
