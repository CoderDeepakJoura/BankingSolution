using BankingPlatform.Infrastructure.Models.Salary;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BankingPlatform.Infrastructure.Configurations.Salary
{
    public class EmployeeDesignationConfiguration : IEntityTypeConfiguration<EmployeeDesignation>
    {
        public void Configure(EntityTypeBuilder<EmployeeDesignation> entity)
        {
            entity.ToTable("employeedesignation");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("employeedesignation_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.Property(e => e.alias).HasMaxLength(20);
            entity.Property(e => e.description).HasMaxLength(150);
        }
    }

    public class EmployeeMasterConfiguration : IEntityTypeConfiguration<EmployeeMaster>
    {
        public void Configure(EntityTypeBuilder<EmployeeMaster> entity)
        {
            entity.ToTable("employeemaster");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("employeemaster_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.Property(e => e.code).HasMaxLength(50);
            entity.Property(e => e.firstname).HasMaxLength(80);
            entity.Property(e => e.lastname).HasMaxLength(80);
            entity.Property(e => e.phone).HasMaxLength(20);
            entity.Property(e => e.emailid).HasMaxLength(50);
            entity.Property(e => e.address).HasMaxLength(200);
            entity.Property(e => e.remarks).HasMaxLength(200);
        }
    }

    public class SalaryComponentConfiguration : IEntityTypeConfiguration<SalaryComponent>
    {
        public void Configure(EntityTypeBuilder<SalaryComponent> entity)
        {
            entity.ToTable("salarycomponent");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("salarycomponent_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.Property(e => e.alias).HasMaxLength(50);
            entity.Property(e => e.description).HasMaxLength(200);
            entity.Property(e => e.formulaecode).HasMaxLength(1);
        }
    }

    public class SalaryCompEmpWiseConfiguration : IEntityTypeConfiguration<SalaryCompEmpWise>
    {
        public void Configure(EntityTypeBuilder<SalaryCompEmpWise> entity)
        {
            entity.ToTable("salarycompempwise");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("salarycompempwise_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.Property(e => e.amount).HasColumnType("numeric(18,2)");
        }
    }

    public class MonthlySalaryConfiguration : IEntityTypeConfiguration<MonthlySalary>
    {
        public void Configure(EntityTypeBuilder<MonthlySalary> entity)
        {
            entity.ToTable("monthlysalary");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("monthlysalary_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
        }
    }

    public class MonthlySalaryEmpDetailConfiguration : IEntityTypeConfiguration<MonthlySalaryEmpDetail>
    {
        public void Configure(EntityTypeBuilder<MonthlySalaryEmpDetail> entity)
        {
            entity.ToTable("monthlysalaryempdetail");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("monthlysalaryempdetail_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.Property(e => e.totalgross).HasColumnType("numeric(18,2)");
            entity.Property(e => e.totaldeduction).HasColumnType("numeric(18,2)");
            entity.Property(e => e.netpay).HasColumnType("numeric(18,2)");
        }
    }

    public class MonthlySalaryCompDetailConfiguration : IEntityTypeConfiguration<MonthlySalaryCompDetail>
    {
        public void Configure(EntityTypeBuilder<MonthlySalaryCompDetail> entity)
        {
            entity.ToTable("monthlysalarycompdetail");
            entity.HasKey(e => new { e.id, e.branchid }).HasName("monthlysalarycompdetail_pkey");
            entity.Property(e => e.id).ValueGeneratedOnAdd();
            entity.Property(e => e.amount).HasColumnType("numeric(18,2)");
        }
    }
}
