using BankingPlatform.Infrastructure.Models.member;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.member
{
    public class MemberDocDetailsConfiguration: IEntityTypeConfiguration<MemberDocDetails>
    {
        public void Configure(EntityTypeBuilder<MemberDocDetails> entity)
        {
            entity.HasKey(e => new { e.Id, e.BranchId })
              .HasName("MemberDocDetails_pkey");

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

            // Document Number Columns
            entity.Property(e => e.PanCardNo)
                  .HasColumnName("PanCardNo")
                  .HasMaxLength(20)
                  .IsRequired();

            entity.Property(e => e.AadhaarCardNo)
                  .HasColumnName("AadhaarCardNo")
                  .HasMaxLength(20)
                  .IsRequired();

            // File Extension Columns
            entity.Property(e => e.MemberPicExt)
                  .HasColumnName("MemberPicExt")
                  .HasMaxLength(10)
                  .IsRequired();

            entity.Property(e => e.MemberSignExt)
                  .HasColumnName("MemberSignExt")
                  .HasMaxLength(10)
                  .IsRequired();

            // Unique Index (as per schema)
            entity.HasIndex(e => new { e.Id, e.BranchId })
                  .IsUnique()
                  .HasDatabaseName("IX_MemberDocDetails_id_brid");

            // Foreign Key Relationship with CASCADE DELETE
            entity.HasOne(e => e.Member)
                  .WithOne() // One-to-one relationship with Member
                  .HasForeignKey<MemberDocDetails>(e => new { e.MemberId, e.BranchId })
                  .HasConstraintName("FK_MemberDocDetails_Member")
                  .OnDelete(DeleteBehavior.Cascade); // CASCADE DELETE as per schema

            // Additional Index for performance on MemberId lookup
            entity.HasIndex(e => new { e.MemberId, e.BranchId })
                  .HasDatabaseName("IX_MemberDocDetails_MemberId_BranchId");
        }
    
    }
}
