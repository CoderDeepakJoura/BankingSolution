// UserConfiguration.cs
using BankingPlatform.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Reflection.Emit;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> entity)
    {
        entity.HasKey(e => new { e.id, e.branchid }).HasName("users_pkey");
        entity.Property(e => e.id).ValueGeneratedOnAdd();
    }
}
