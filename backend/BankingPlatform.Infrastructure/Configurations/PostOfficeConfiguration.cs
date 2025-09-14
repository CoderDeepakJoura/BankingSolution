// POConfiguration.cs
using BankingPlatform.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Reflection.Emit;

public class PostOfficeConfiguration : IEntityTypeConfiguration<PostOffice>
{
    public void Configure(EntityTypeBuilder<PostOffice> entity)
    {
        entity.HasKey(e => new { e.id, e.branchid }).HasName("postOffice_pkey");
        entity.Property(e => e.id).ValueGeneratedOnAdd();
        entity.HasIndex(e => new { e.id, e.postofficename, e.postofficecode }).IsUnique();
    }
}
