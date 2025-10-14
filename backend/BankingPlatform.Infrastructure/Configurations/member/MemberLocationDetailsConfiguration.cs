using BankingPlatform.Infrastructure.Models.member;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.member
{
    public class MemberLocationDetailsConfiguration: IEntityTypeConfiguration<MemberLocationDetails>
    {
        public void Configure(EntityTypeBuilder<MemberLocationDetails> entity)
        {
            // Composite Primary Key (exactly as per schema)
            entity.HasKey(e => new { e.Id, e.BranchId })
                  .HasName("MemberLocationDetails_pkey");

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

            // Address Line Columns
            entity.Property(e => e.AddressLine1)
                  .HasColumnName("AddressLine1")
                  .HasMaxLength(150)
                  .IsRequired();

            entity.Property(e => e.AddressLineSL1)
                  .HasColumnName("AddressLineSL1")
                  .HasMaxLength(150);

            entity.Property(e => e.AddressLine2)
                  .HasColumnName("AddressLine2")
                  .HasMaxLength(150);

            entity.Property(e => e.AddressLineSL2)
                  .HasColumnName("AddressLineSL2")
                  .HasMaxLength(150);

            // Village ID Columns
            entity.Property(e => e.VillageId1)
                  .HasColumnName("VillageId1")
                  .IsRequired();

            entity.Property(e => e.VillageId2)
                  .HasColumnName("VillageId2");

            // PO Columns
            entity.Property(e => e.PO1)
                  .HasColumnName("PO1")
                  .IsRequired();

            entity.Property(e => e.PO2)
                  .HasColumnName("PO2");

            // Tehsil Columns
            entity.Property(e => e.Tehsil1)
                  .HasColumnName("Tehsil1")
                  .IsRequired();

            entity.Property(e => e.Tehsil2)
                  .HasColumnName("Tehsil2");

            // Thana ID Columns
            entity.Property(e => e.ThanaId1)
                  .HasColumnName("ThanaId1")
                  .IsRequired();

            entity.Property(e => e.ThanaId2)
                  .HasColumnName("ThanaId2");

            // Zone ID Columns
            entity.Property(e => e.ZoneId1)
                  .HasColumnName("ZoneId1")
                  .IsRequired();

            entity.Property(e => e.ZoneId2)
                  .HasColumnName("ZoneId2");

            // Unique Index (as per schema)
            entity.HasIndex(e => new { e.Id, e.BranchId })
                  .IsUnique()
                  .HasDatabaseName("IX_MemberLocationDetails_id_brid");

            // Foreign Key Relationship with CASCADE DELETE
            entity.HasOne(e => e.Member)
                  .WithMany() // Member can have multiple location details
                  .HasForeignKey(e => new { e.MemberId, e.BranchId })
                  .HasConstraintName("FK_MemberLocationDetails_Member")
                  .OnDelete(DeleteBehavior.Cascade); // CASCADE DELETE as per schema

            // Additional Index for performance on MemberId lookup
            entity.HasIndex(e => new { e.MemberId, e.BranchId })
                  .HasDatabaseName("IX_MemberLocationDetails_MemberId_BranchId");
        }
    }
}
