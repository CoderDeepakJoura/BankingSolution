using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.Infrastructure.Models;

public partial class BankingDbContext : DbContext
{
    public BankingDbContext()
    {
    }

    public BankingDbContext(DbContextOptions<BankingDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<user> users { get; set; }
    public virtual DbSet<Zone> zone { get; set; }

   
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<user>(entity =>
        {
            entity.HasKey(e => new { e.id, e.branchcode }).HasName("users_pkey");
        });
        modelBuilder.Entity<Zone>(entity =>
        {
            entity.HasKey(e => new { e.id, e.branchid }).HasName("zones_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.id, e.zonename, e.zonecode }).IsUnique();

        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
