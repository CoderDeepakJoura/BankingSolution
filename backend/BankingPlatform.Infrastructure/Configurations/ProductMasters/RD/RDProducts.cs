using BankingPlatform.Infrastructure.Models.ProductMasters.RD;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.ProductMasters.RD
{
    // Configurations/RDProductConfiguration.cs
    public class RDProductConfiguration : IEntityTypeConfiguration<RDProduct>
    {
        public void Configure(EntityTypeBuilder<RDProduct> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId })
                  .HasName("RDProduct_pkey");

            entity.Property(e => e.Id)
                  .ValueGeneratedOnAdd()
                  .UseIdentityAlwaysColumn();

            entity.Property(e => e.BrId)
                  .IsRequired();

            entity.Property(e => e.ProductName)
                  .IsRequired()
                  .HasMaxLength(255);

            entity.Property(e => e.ProductNameSL)
                  .IsRequired()
                  .HasMaxLength(255);

            entity.Property(e => e.ProductCode)
                  .IsRequired()
                  .HasMaxLength(10);

            entity.Property(e => e.EffectiveFrom)
                  .IsRequired()
                  .HasColumnType("timestamp without time zone");

        }
        // Configurations/RDProductDefinitionConfiguration.cs
        public class RDProductDefinitionConfiguration : IEntityTypeConfiguration<RDProductDefinition>
        {
            public void Configure(EntityTypeBuilder<RDProductDefinition> entity)
            {
                entity.HasKey(e => new { e.Id, e.BrId })
                      .HasName("RDProductDefinition_pkey");

                entity.Property(e => e.Id)
                      .ValueGeneratedOnAdd()
                      .UseIdentityAlwaysColumn();

                entity.Property(e => e.BrId)
                      .IsRequired();

                entity.Property(e => e.RDProductId)
                      .IsRequired(false);

                entity.Property(e => e.DocPlanId)
                      .IsRequired(false);

                entity.Property(e => e.MinPeriodLimitMonths)
                      .IsRequired(false);

                entity.Property(e => e.MaxPeriodLimitMonths)
                      .IsRequired(false);

            }
        }
        // Configurations/RDProductInterestRulesConfiguration.cs
        public class RDProductInterestRulesConfiguration : IEntityTypeConfiguration<RDProductInterestRules>
        {
            public void Configure(EntityTypeBuilder<RDProductInterestRules> entity)
            {
                entity.HasKey(e => new { e.Id, e.BrId })
                      .HasName("RDProductInterestRules_pkey");

                entity.Property(e => e.Id)
                      .ValueGeneratedOnAdd()
                      .UseIdentityAlwaysColumn();

                entity.Property(e => e.BrId)
                      .IsRequired();

                entity.Property(e => e.ProductId)
                      .IsRequired(false);

                entity.Property(e => e.Date)
                      .IsRequired(false)
                      .HasColumnType("timestamp without time zone");

                entity.Property(e => e.IntRateFrom)
                      .IsRequired(false);

                entity.Property(e => e.IntRateTo)
                      .IsRequired(false);

                entity.Property(e => e.IntVariationForAccLess)
                      .IsRequired(false);

                entity.Property(e => e.IntVariationForAccExceed)
                      .IsRequired(false);

                entity.Property(e => e.IntPostingInterval)
                      .IsRequired(false);

                entity.Property(e => e.IntCompoundingInterval)
                      .IsRequired(false);

                entity.Property(e => e.ActOnIntPosting)
                      .IsRequired(false);

                entity.Property(e => e.IntRateOnPreMat)
                      .IsRequired(false);

                entity.Property(e => e.PostMaturityIntRate)
                      .IsRequired(false);

                entity.Property(e => e.MinLockInPerioddays)
                      .IsRequired(false);

            }
        }
        // Configurations/RDProductPostingConfiguration.cs
        public class RDProductPostingConfiguration : IEntityTypeConfiguration<RDProductPosting>
        {
            public void Configure(EntityTypeBuilder<RDProductPosting> entity)
            {
                entity.HasKey(e => new { e.Id, e.BrId })
                      .HasName("RDProductPosting_pkey");

                entity.Property(e => e.Id)
                      .ValueGeneratedOnAdd()
                      .UseIdentityAlwaysColumn();

                entity.Property(e => e.BrId)
                      .IsRequired();

                entity.Property(e => e.RDProductId)
                      .IsRequired(false);

                entity.Property(e => e.PrincipalBalHeadCode)
                      .IsRequired(false);

                entity.Property(e => e.IntPayableHeadCode)
                      .IsRequired(false);

            }
        }


    }

}
