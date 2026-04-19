using BankingPlatform.Infrastructure.Models.BranchWiseRule;

namespace BankingPlatform.Infrastructure.Configurations.BranchWiseRule
{
    public class LoanProductBranchwiseruleConfiguration : IEntityTypeConfiguration<LoanProductBranchWiseRule>
    {
        public void Configure(EntityTypeBuilder<LoanProductBranchWiseRule> builder)
        {
            builder.HasKey(e => new { e.Id, e.BranchId }).HasName("loanproductbranchwiserule_pkey");
            builder.Property(e => e.Id).ValueGeneratedOnAdd();
        }
    }
}