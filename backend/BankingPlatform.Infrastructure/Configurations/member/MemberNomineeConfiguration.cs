using BankingPlatform.Infrastructure.Models.member;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.member
{
    public class MemberNomineeConfiguration: IEntityTypeConfiguration<MemberNomineeDetails>
    {
        public void Configure(EntityTypeBuilder<MemberNomineeDetails> entity)
        {

            // Composite Primary Key Configuration (exactly as per schema)
            entity.HasKey(e => new { e.Id, e.BranchId })
                  .HasName("MemberNomineeDetails_pkey");

            // ID Column - GENERATED ALWAYS AS IDENTITY
            entity.Property(e => e.Id)
                  .HasColumnName("ID")
                  .ValueGeneratedOnAdd()
                  .UseIdentityAlwaysColumn(); // PostgreSQL GENERATED ALWAYS AS IDENTITY

            // BranchId Column
            entity.Property(e => e.BranchId)
                  .HasColumnName("BranchId")
                  .IsRequired();

            // MemberId Column  
            entity.Property(e => e.MemberId)
                  .HasColumnName("MemberId")
                  .IsRequired();

            // Name Columns
            entity.Property(e => e.NomineeName)
                  .HasColumnName("NomineeName")
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(e => e.NomRelativeName)
                  .HasColumnName("NomRelativeName")
                  .HasMaxLength(10);

            // Relation Columns
            entity.Property(e => e.RelationId)
                  .HasColumnName("RelationId")
                  .IsRequired();

            entity.Property(e => e.RelationWithMember)
                  .HasColumnName("RelationWithMember")
                  .IsRequired();

            // Age and DOB
            entity.Property(e => e.Age)
                  .HasColumnName("Age")
                  .IsRequired();

            entity.Property(e => e.DOB)
                  .HasColumnName("DOB")
                  .HasColumnType("timestamp(3)")
                  .IsRequired();

            // Minor Status (SMALLINT)
            entity.Property(e => e.IsMinor)
                  .HasColumnName("IsMinor")
                  .HasColumnType("smallint");

            // Guardian Details
            entity.Property(e => e.NameOfGuardian)
                  .HasColumnName("NameOfGuardian")
                  .HasMaxLength(100);

            entity.Property(e => e.NameOfGuardianSL)
                  .HasColumnName("NameOfGuardianSL")
                  .HasMaxLength(100);

            // Nomination Date
            entity.Property(e => e.NominationDate)
                  .HasColumnName("NominationDate")
                  .HasColumnType("timestamp(3)");

            // Document Numbers
            entity.Property(e => e.AadhaarCardNo)
                  .HasColumnName("AadhaarCardNo")
                  .HasMaxLength(25)
                  .IsRequired();

            entity.Property(e => e.PanCardNo)
                  .HasColumnName("PanCardNo")
                  .HasMaxLength(25);

            // Percentage Share (NUMERIC(5,2))
            entity.Property(e => e.PercentageShare)
                  .HasColumnName("PercentageShare")
                  .HasColumnType("numeric(5,2)")
                  .IsRequired();

            // Foreign Key Relationship with CASCADE DELETE
            entity.HasOne(e => e.Member)
                  .WithMany() // Member can have many nominees
                  .HasForeignKey(e => new { e.MemberId, e.BranchId })
                  .HasConstraintName("FK_MemberNomineeDetails_Member")
                  .OnDelete(DeleteBehavior.Cascade); // CASCADE DELETE as per schema

            // Indexes for performance
            entity.HasIndex(e => new { e.MemberId, e.BranchId })
                  .HasDatabaseName("IX_MemberNomineeDetails_MemberId_BranchId");


        }
    }
}
