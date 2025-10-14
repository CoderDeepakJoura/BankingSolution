// ZoneConfiguration.cs
using BankingPlatform.Infrastructure.Models.Location;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ZoneConfiguration : IEntityTypeConfiguration<Zone>
{
    public void Configure(EntityTypeBuilder<Zone> entity)
    {
        entity.HasKey(e => new { e.id, e.branchid }).HasName("zones_pkey");

        entity.Property(e => e.id)
              .ValueGeneratedOnAdd();

        entity.HasIndex(e => new { e.id, e.zonename, e.zonecode })
              .IsUnique();
    }
}
