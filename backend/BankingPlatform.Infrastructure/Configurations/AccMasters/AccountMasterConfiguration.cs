using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using BankingPlatform.Infrastructure.Models.AccMasters;

namespace BankingPlatform.Infrastructure.Configurations.AccMasters
{
    public class AccountMasterConfiguration : IEntityTypeConfiguration<AccountMaster>
    {
        public void Configure(EntityTypeBuilder<AccountMaster> entity)
        {
            entity.HasKey(e => new { e.ID, e.BranchId }).HasName("AccountMaster_pkey");
            entity.Property(e => e.ID).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.ID, e.BranchId }).IsUnique();
        }
    }
    public class AccountNomineeConfiguration : IEntityTypeConfiguration<AccountNomineeInfo>
    {
        public void Configure(EntityTypeBuilder<AccountNomineeInfo> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId }).HasName("accountNomineeInfo_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.Id, e.BranchId }).IsUnique();
        }
    }
    public class AccountDocDetailsConfiguration : IEntityTypeConfiguration<AccountDocDetails>
    {
        public void Configure(EntityTypeBuilder<AccountDocDetails> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId }).HasName("accountdocdetails_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.Id, e.BranchId }).IsUnique();
        }
    }
    public class JointAccountInfoConfiguration : IEntityTypeConfiguration<JointAccountInfo>
    {
        public void Configure(EntityTypeBuilder<JointAccountInfo> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId }).HasName("jointAccountInfo_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.Id, e.BranchId }).IsUnique();
        }
    }
    public class JointAccountWithdrawalInfoConfiguration : IEntityTypeConfiguration<JointAccountWithdrawalInfo>
    {
        public void Configure(EntityTypeBuilder<JointAccountWithdrawalInfo> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId }).HasName("jointaccountwithdrawalinfo_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.Id, e.BranchId }).IsUnique();
        }
    }
}
