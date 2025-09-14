// CategoryConfiguration.cs
using BankingPlatform.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Reflection.Emit;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> entity)
    {
        entity.HasKey(e => new { e.id, e.branchid }).HasName("category_pkey");
        entity.Property(e => e.id).ValueGeneratedOnAdd();
        entity.HasIndex(e => new { e.id, e.categoryname }).IsUnique();
    }
}
