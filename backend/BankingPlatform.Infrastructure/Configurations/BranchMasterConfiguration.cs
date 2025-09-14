
global using BankingPlatform.Infrastructure.Models;
global using BankingPlatform.Infrastructure.Settings;
global using Microsoft.Extensions.Logging;
global using Microsoft.Extensions.Options;
global using System.ComponentModel.DataAnnotations;
global using Microsoft.EntityFrameworkCore.Metadata.Builders;
global using System.Text;
namespace BankingPlatform.Infrastructure.Configurations
{
    public class BranchMasterConfiguration : IEntityTypeConfiguration<branchMaster>
    {
        public void Configure(EntityTypeBuilder<branchMaster> entity)
        {
            entity.HasKey(e => new { e.id }).HasName("branchmaster_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.id }).IsUnique();
        }
    }
}
