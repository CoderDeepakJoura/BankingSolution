using BankingPlatform.Infrastructure.Models.member;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.member
{
    public class MemberConfiguration: IEntityTypeConfiguration<Member>
    {
        public void Configure(EntityTypeBuilder<Member> entity)
        {

            entity.HasKey(e => new { e.Id, e.BranchId })
              .HasName("member_pkey");


            // Identity Column Configuration for PostgreSQL
            entity.Property(e => e.Id)
                  .ValueGeneratedOnAdd()
                  .UseIdentityAlwaysColumn() // PostgreSQL specific for GENERATED ALWAYS AS IDENTITY
                  .HasColumnName("ID");

            entity.Property(e => e.BranchId)
                  .IsRequired()
                  .HasColumnName("BranchId");

            // Configure other properties to match database schema
            entity.Property(e => e.DefAreaBrId)
                  .IsRequired()
                  .HasColumnName("DefAreaBrId");

            entity.Property(e => e.MemberName)
                  .IsRequired()
                  .HasMaxLength(100)
                  .HasColumnName("MemberName");

            entity.Property(e => e.DOB)
                  .IsRequired()
                  .HasColumnType("timestamp(3)")
                  .HasColumnName("DOB");

            entity.Property(e => e.JoiningDate)
                  .IsRequired()
                  .HasColumnType("timestamp(3)")
                  .HasColumnName("JoiningDate");

            entity.Property(e => e.MemberStatusDate)
                  .IsRequired()
                  .HasColumnType("timestamp(3)")
                  .HasColumnName("MemberStatusDate");

            // Configure string length constraints
            entity.Property(e => e.NominalMembershipNo)
                  .HasMaxLength(20);

            entity.Property(e => e.PermanentMembershipNo)
                  .HasMaxLength(20);

            entity.Property(e => e.MemberNameSL)
                  .HasMaxLength(100);

            entity.Property(e => e.RelativeName)
                  .HasMaxLength(100);

            entity.Property(e => e.RelativeNameSL)
                  .HasMaxLength(100);

            entity.Property(e => e.PhonePrefix1)
                  .IsRequired()
                  .HasMaxLength(5);

            entity.Property(e => e.PhoneNo1)
                  .IsRequired()
                  .HasMaxLength(20);

            entity.Property(e => e.PhonePrefix2)
                  .HasMaxLength(5);

            entity.Property(e => e.PhoneNo2)
                  .HasMaxLength(20);

            // Indexes for performance
            entity.HasIndex(e => new { e.Id, e.BranchId })
                  .HasDatabaseName("IX_member_id_brid");

        }
    }
}
