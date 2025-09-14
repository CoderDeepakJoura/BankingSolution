// TehsilConfiguration.cs
using BankingPlatform.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Reflection.Emit;

public class TehsilConfiguration : IEntityTypeConfiguration<Tehsil>
{
    public void Configure(EntityTypeBuilder<Tehsil> entity)
    {
        entity.HasKey(e => new { e.id, e.branchid }).HasName("tehsil_pkey");
        entity.Property(e => e.id).ValueGeneratedOnAdd();
        entity.HasIndex(e => new { e.id, e.tehsilname, e.tehsilcode }).IsUnique();
    }
}
