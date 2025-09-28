
global using Microsoft.EntityFrameworkCore;
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

    public virtual DbSet<User> user { get; set; }
    public virtual DbSet<Zone> zone { get; set; }
    public virtual DbSet<Thana> thana { get; set; }
    public virtual DbSet<PostOffice> postoffice { get; set; }
    public virtual DbSet<Tehsil> tehsil { get; set; }
    public virtual DbSet<Category> category { get; set; }
    public virtual DbSet<branchMaster> branchmaster { get; set; }
    public virtual DbSet<AccountHeadType> accountheadtype { get; set; }
    public virtual DbSet<DayBeginEndInfo> daybeginendinfo { get; set; }
    public virtual DbSet<DayBeginEndInfoDetail> daybeginendinfodetail { get; set; }
    public virtual DbSet<AccountHead> accounthead { get; set; }
    public virtual DbSet<Member> member { get; set; }
    public virtual DbSet<MemberNominee> membernominee { get; set; }
    public virtual DbSet<Relation> relation { get; set; }
    public virtual DbSet<Village> village { get; set; }
    public virtual DbSet<State> state { get; set; }
    public virtual DbSet<AccountMaster> accountmaster { get; set; }
    public virtual DbSet<GSTInfo> accgstinfo { get; set; }
    public virtual DbSet<Caste> caste { get; set; }
    public virtual DbSet<ErrorLog> errorlog { get; set; }
   

   
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BankingDbContext).Assembly);
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Table name
            entity.SetTableName(entity.GetTableName()!.ToLower());

            // Columns
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(property.GetColumnName()!.ToLower());
            }

            // Keys
            foreach (var key in entity.GetKeys())
            {
                key.SetName(key.GetName()!.ToLower());
            }

            // Foreign keys
            foreach (var fk in entity.GetForeignKeys())
            {
                fk.SetConstraintName(fk.GetConstraintName()!.ToLower());
            }

            // Indexes
            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(index.GetDatabaseName()!.ToLower());
            }
        }

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
