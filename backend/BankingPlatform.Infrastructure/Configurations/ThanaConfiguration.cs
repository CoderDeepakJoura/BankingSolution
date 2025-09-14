// ThanaConfiguration.cs
using BankingPlatform.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Reflection.Emit;

public class ThanaConfiguration : IEntityTypeConfiguration<Thana>
{
    public void Configure(EntityTypeBuilder<Thana> entity)
    {
        entity.HasKey(e => new { e.id, e.branchid }).HasName("thana_pkey");
        entity.Property(e => e.id).ValueGeneratedOnAdd();
        entity.HasIndex(e => new { e.id, e.thananame, e.thanacode }).IsUnique();
    }
}
