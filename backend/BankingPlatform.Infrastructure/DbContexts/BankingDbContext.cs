
global using Microsoft.EntityFrameworkCore;
using BankingPlatform.Infrastructure.Models.AccHeads;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Models.NPA;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Security.Claims;
using System.Text.Json;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.AccMasters.Loan;
using BankingPlatform.Infrastructure.Models.BranchSessions;
using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;
using BankingPlatform.Infrastructure.Models.InterestSlabs.Loan;
using BankingPlatform.Infrastructure.Models.InterestSlabs.RD;
using BankingPlatform.Infrastructure.Models.InterestSlabs.Saving;
using BankingPlatform.Infrastructure.Models.Location;
using BankingPlatform.Infrastructure.Models.member;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Models.ProductMasters.FD;
using BankingPlatform.Infrastructure.Models.ProductMasters.Loan;
using BankingPlatform.Infrastructure.Models.ProductMasters.RD;
using BankingPlatform.Infrastructure.Models.ProductMasters.Saving;
using BankingPlatform.Infrastructure.Models.Settings;
using BankingPlatform.Infrastructure.Models.Auth;
using BankingPlatform.Infrastructure.Models.voucher;
using BankingPlatform.Infrastructure.Models.GST;
using BankingPlatform.Infrastructure.Models.Services;
namespace BankingPlatform.Infrastructure.Models;

public partial class BankingDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public BankingDbContext()
    {
    }

    public BankingDbContext(DbContextOptions<BankingDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public virtual DbSet<User> user { get; set; }
    public virtual DbSet<RefreshToken> refreshtoken { get; set; }
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
    public virtual DbSet<MemberNomineeDetails> membernomineedetails { get; set; }
    public virtual DbSet<MemberLocationDetails> memberlocationdetails { get; set; }
    public virtual DbSet<MemberDocDetails> memberdocdetails { get; set; }
    public virtual DbSet<Relation> relation { get; set; }
    public virtual DbSet<Village> village { get; set; }
    public virtual DbSet<State> state { get; set; }
    public virtual DbSet<AccountMaster> accountmaster { get; set; }
    public virtual DbSet<GSTInfo> accgstinfo { get; set; }
    public virtual DbSet<Caste> caste { get; set; }
    public virtual DbSet<ErrorLog> errorlog { get; set; }
    public virtual DbSet<Voucher> voucher { get; set; }
    public virtual DbSet<VoucherCreditDebitDetails> vouchercreditdebitdetails { get; set; }
    public virtual DbSet<Occupation> occupation { get; set; }
    public virtual DbSet<GeneralSettings> generalsettings { get; set; }
    public virtual DbSet<VoucherSettings> vouchersettings { get; set; }
    public virtual DbSet<AccOpeningBalance> accopeningbalance { get; set; }
    public virtual DbSet<Patwar> patwar { get; set; }
    public virtual DbSet<FDProduct> fdproduct { get; set; }
    public virtual DbSet<FDProductInterestRules> fdproductinterestrules { get; set; }
    public virtual DbSet<FDProductPostingHeads> fdproductpostingheads { get; set; }
    public virtual DbSet<FDProductRules> fdproductrules { get; set; }
    public virtual DbSet<SavingProduct> savingproduct { get; set; }
    public virtual DbSet<SavingsProductInterestRules> savingproductinterestrules { get; set; }
    public virtual DbSet<SavingsProductPostingHeads> savingproductpostingheads { get; set; }
    public virtual DbSet<SavingsProductRules> savingproductrules { get; set; }
    public virtual DbSet<AccountSettings> accountsettings { get; set; }
    public virtual DbSet<TDSSettings> tdssettings { get; set; }
    public virtual DbSet<PrintingSettings> printingsettings { get; set; }
    public virtual DbSet<SavingProductBranchWiseRule> savingproductbranchwiserule { get; set; }
    public virtual DbSet<FDProductBranchWiseRule> fdproductbranchwiserule { get; set; }
    public virtual DbSet<SavingInterestSlab> savinginterestslab { get; set; }
    public virtual DbSet<SavingInterestSlabDetail> savinginterestslabdetail { get; set; }
    public virtual DbSet<AccountNomineeInfo> accountnomineeinfo { get; set; }
    public virtual DbSet<AccountDocDetails> accountdocdetails { get; set; }
    public virtual DbSet<JointAccountInfo> jointaccountinfo { get; set; }
    public virtual DbSet<JointAccountWithdrawalInfo> jointaccountwithdrawalinfo { get; set; }
    public virtual DbSet<BranchSession> branchsession { get; set; }
    public virtual DbSet<VoucherSavingDetail> vouchersavingdetail { get; set; }
    public virtual DbSet<FDInterestSlab> fdinterestslab { get; set; }
    public virtual DbSet<FDInterestSlabInfo> fdinterestslabinfo { get; set; }
    public virtual DbSet<FDInterestSlabDetail> fdinterestslabdetail { get; set; }
    public virtual DbSet<FDAccountDetail> fdaccountdetail { get; set; }
    public virtual DbSet<VoucherFDDetail> voucherfddetail { get; set; }
    public virtual DbSet<RDInterestSlab> rdinterestslab { get; set; }
    public virtual DbSet<RDInterestSlabDetail> rdinterestslabdetail { get; set; }
    public virtual DbSet<RDProduct> rdproduct { get; set; }
    public virtual DbSet<RDProductDefinition> rdproductdefinition { get; set; }
    public virtual DbSet<RDProductInterestRules> rdproductinterestrules { get; set; }
    public virtual DbSet<RDProductPosting> rdproductposting { get; set; }
    public virtual DbSet<RDProductBranchWiseRule> rdproductbranchwiserule { get; set; }
    public virtual DbSet<RDAccountDetail> rdaccountdetail { get; set; }
    public virtual DbSet<VoucherRDDetail> voucherrddetail { get; set; }
    public virtual DbSet<LoanSlab> loanslab { get; set; }
    public virtual DbSet<LoanSlabDetail> loanslabdetail { get; set; }
    public virtual DbSet<LoanProduct> loanproduct { get; set; }
    public virtual DbSet<AccountKistDetail> accountkistdetail { get; set; }
    public virtual DbSet<AccountLimitDetail> accountlimitdetail { get; set; }
    public virtual DbSet<AccountKistSchedule> accountkistschedule { get; set; }
    public virtual DbSet<LoanAccFDPledge> loanaccfdpledge { get; set; }
    public virtual DbSet<LoanAccFDPledgeDetail> loanaccfdpledgedetail { get; set; }
    public virtual DbSet<LoanAccRDPledge> loanaccrdpledge { get; set; }
    public virtual DbSet<LoanAccRDPledgeDetail> loanaccrdpledgedetail { get; set; }
    public virtual DbSet<LoanAccOpeningBalance> loanaccopeningbalance { get; set; }
    public virtual DbSet<LoanAccountBalanceDetail> loanaccountbalancedetail { get; set; }
    public virtual DbSet<LoanAccountRecoveryInterest> loanaccountrecoveryinterest { get; set; }
    public virtual DbSet<LoanGuarWitness> loanguarwitness { get; set; }
    public virtual DbSet<LoanProductDefinition> loanproductdefinition { get; set; }
    public virtual DbSet<LoanProductAdvancement> loanproductadvancement { get; set; }
    public virtual DbSet<LoanProductMarginMoneyRule> loanproductmarginmoneyrule { get; set; }
    public virtual DbSet<LoanProductPosting> loanproductposting { get; set; }
    public virtual DbSet<LoanProductRecovery> loanproductrecovery { get; set; }
    public virtual DbSet<LoanProductBranchWiseRule> loanproductbranchwiserule { get; set; }
    public virtual DbSet<VoucherRecIntDetail> voucherrecintdetail { get; set; }
    public virtual DbSet<VrOdReserve> vrodreserve { get; set; }
    public virtual DbSet<AuditLog> auditlog { get; set; }
    public virtual DbSet<NPAPlanMaster> npaplanmaster { get; set; }
    public virtual DbSet<NPAPlanCategory> npaplancategory { get; set; }
    public virtual DbSet<ExpenseCategory> expensecategory { get; set; }
    public virtual DbSet<TaxType> taxtype { get; set; }
    public virtual DbSet<TaxGroup> taxgroup { get; set; }
    public virtual DbSet<TaxGroupType> taxgrouptype { get; set; }
    public virtual DbSet<Tax> tax { get; set; }
    public virtual DbSet<TaxDetail> taxdetail { get; set; }
    public virtual DbSet<BillBook> billbook { get; set; }
    public virtual DbSet<GSTSetting> gstsetting { get; set; }
    public virtual DbSet<ServiceMaster> service { get; set; }
    public virtual DbSet<ServiceTaxRule> servicetaxrule { get; set; }
    public virtual DbSet<ServiceTaxTypeDet> servicetaxtypedet { get; set; }
    public virtual DbSet<AccServiceDetail> accservicedetail { get; set; }

    // ── Audit logging ────────────────────────────────────────────────────────────

    private static readonly HashSet<string> _skipAuditEntities = new(StringComparer.OrdinalIgnoreCase)
    {
        nameof(AuditLog),
        nameof(ErrorLog),
        "RefreshToken",
        "DayBeginEndInfo",
        "DayBeginEndInfoDetail",
        "BranchSession",
    };

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnforceAuditLogImmutability();
        var auditEntries = BuildAuditEntries();
        var result = await base.SaveChangesAsync(cancellationToken);

        if (auditEntries.Count > 0)
        {
            auditlog.AddRange(auditEntries);
            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    private void EnforceAuditLogImmutability()
    {
        var tampered = ChangeTracker.Entries<AuditLog>()
            .Any(e => e.State is EntityState.Modified or EntityState.Deleted);

        if (tampered)
            throw new InvalidOperationException("Audit log records are immutable and cannot be modified or deleted.");
    }

    private List<AuditLog> BuildAuditEntries()
    {
        var ctx = GetAuditContext();
        if (string.IsNullOrEmpty(ctx.UserId))
            return new List<AuditLog>();

        var entries = new List<AuditLog>();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State is EntityState.Detached or EntityState.Unchanged)
                continue;

            var typeName = entry.Entity.GetType().Name;
            if (_skipAuditEntities.Contains(typeName))
                continue;

            var action = entry.State switch
            {
                EntityState.Added    => "CREATE",
                EntityState.Modified => "UPDATE",
                EntityState.Deleted  => "DELETE",
                _                    => null
            };
            if (action is null) continue;

            entries.Add(new AuditLog
            {
                BranchId   = ctx.BranchId,
                UserId     = ctx.UserId,
                UserName   = ctx.UserName,
                Action     = action,
                Module     = ResolveModule(entry.Entity.GetType().Namespace ?? ""),
                EntityName = typeName,
                EntityId   = GetEntityId(entry),
                OldValue   = entry.State is EntityState.Modified or EntityState.Deleted
                                 ? SerializeValues(entry.OriginalValues) : null,
                NewValue   = entry.State is EntityState.Added or EntityState.Modified
                                 ? SerializeValues(entry.CurrentValues) : null,
                IpAddress   = ctx.IpAddress,
                WorkingDate = ctx.WorkingDate,
                CreatedAt   = DateTime.Now,
            });
        }

        return entries;
    }

    private AuditContext GetAuditContext()
    {
        var httpContext = _httpContextAccessor?.HttpContext;
        if (httpContext is null) return new AuditContext();

        var user = httpContext.User;
        int.TryParse(user.FindFirst("branchId")?.Value, out var branchId);

        return new AuditContext
        {
            BranchId    = branchId,
            UserId      = user.FindFirst("userId")?.Value ?? "",
            UserName    = user.FindFirst(ClaimTypes.Name)?.Value ?? "",
            WorkingDate = user.FindFirst("workingDate")?.Value ?? "",
            IpAddress   = httpContext.Connection.RemoteIpAddress?.ToString() ?? "",
        };
    }

    private static string? GetEntityId(EntityEntry entry)
    {
        var pks = entry.Metadata.FindPrimaryKey()?.Properties;
        if (pks is null) return null;

        var parts = pks.Select(pk =>
        {
            var val = entry.State == EntityState.Deleted
                ? entry.OriginalValues[pk.Name]
                : entry.CurrentValues[pk.Name];
            return $"{pk.Name}:{val}";
        });

        return string.Join(", ", parts);
    }

    private static string SerializeValues(PropertyValues values)
    {
        var dict = new Dictionary<string, object?>();
        foreach (var prop in values.Properties)
            dict[prop.Name] = values[prop.Name];

        return JsonSerializer.Serialize(dict, AuditJsonOptions);
    }

    private static readonly JsonSerializerOptions AuditJsonOptions =
        new() { WriteIndented = false };

    private static string ResolveModule(string ns) => ns switch
    {
        _ when ns.Contains(".member",         StringComparison.OrdinalIgnoreCase) => "Member",
        _ when ns.Contains(".voucher",        StringComparison.OrdinalIgnoreCase) => "Voucher",
        _ when ns.Contains(".AccMasters",     StringComparison.OrdinalIgnoreCase) => "Account Master",
        _ when ns.Contains(".ProductMasters", StringComparison.OrdinalIgnoreCase) => "Product Master",
        _ when ns.Contains(".InterestSlabs",  StringComparison.OrdinalIgnoreCase) => "Interest Slab",
        _ when ns.Contains(".BranchWiseRule", StringComparison.OrdinalIgnoreCase) => "Branch Rule",
        _ when ns.Contains(".Settings",       StringComparison.OrdinalIgnoreCase) => "Settings",
        _ when ns.Contains(".Location",       StringComparison.OrdinalIgnoreCase) => "Location",
        _ when ns.Contains(".AccHeads",       StringComparison.OrdinalIgnoreCase) => "Account Head",
        _                                                                          => "General",
    };

    private sealed record AuditContext
    {
        public int    BranchId    { get; init; }
        public string UserId      { get; init; } = "";
        public string UserName    { get; init; } = "";
        public string WorkingDate { get; init; } = "";
        public string IpAddress   { get; init; } = "";
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<VoucherRecIntDetail>()
            .HasKey(x => new { x.Id, x.BrId });

        modelBuilder.Entity<VrOdReserve>()
            .HasKey(x => new { x.Id, x.BrId });

        modelBuilder.Entity<NPAPlanMaster>()
            .HasKey(x => new { x.Id, x.BrId });

        modelBuilder.Entity<NPAPlanCategory>()
            .HasKey(x => new { x.Id, x.BrId });

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
