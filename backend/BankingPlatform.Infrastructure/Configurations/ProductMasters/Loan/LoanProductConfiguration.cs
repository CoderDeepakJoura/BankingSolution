using BankingPlatform.Infrastructure.Models.ProductMasters.Loan;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BankingPlatform.Infrastructure.Configurations.ProductMasters.Loan
{
    public class LoanProductConfiguration : IEntityTypeConfiguration<LoanProduct>
    {
        public void Configure(EntityTypeBuilder<LoanProduct> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("loanproduct_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }

    public class LoanProductDefinitionConfiguration : IEntityTypeConfiguration<LoanProductDefinition>
    {
        public void Configure(EntityTypeBuilder<LoanProductDefinition> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("loanproductdefinition_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }

    public class LoanProductAdvancementConfiguration : IEntityTypeConfiguration<LoanProductAdvancement>
    {
        public void Configure(EntityTypeBuilder<LoanProductAdvancement> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("loanproductadvancement_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }

    public class LoanProductMarginMoneyRuleConfiguration : IEntityTypeConfiguration<LoanProductMarginMoneyRule>
    {
        public void Configure(EntityTypeBuilder<LoanProductMarginMoneyRule> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("loanproductmarginmoneyrule_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }

    public class LoanProductPostingConfiguration : IEntityTypeConfiguration<LoanProductPosting>
    {
        public void Configure(EntityTypeBuilder<LoanProductPosting> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("loanproductposting_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }

    public class LoanProductRecoveryConfiguration : IEntityTypeConfiguration<LoanProductRecovery>
    {
        public void Configure(EntityTypeBuilder<LoanProductRecovery> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("loanproductrecovery_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd().UseIdentityAlwaysColumn();
        }
    }
}