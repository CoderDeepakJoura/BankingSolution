using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.RD
{
    [Table("RDProduct")]
    public class RDProduct
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; } = 1;

        [Required]
        [Column("productname")]
        [StringLength(255)]
        public string ProductName { get; set; } = string.Empty;

        [Required]
        [Column("productnamesl")]
        [StringLength(255)]
        public string ProductNameSL { get; set; } = string.Empty;

        [Required]
        [Column("productcode")]
        [StringLength(10)]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        [Column("effectivefrom", TypeName = "timestamp without time zone")]
        public DateTime EffectiveFrom { get; set; }

    }
    [Table("RDProductDefinition")]
    public class RDProductDefinition
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; } = 1;

        [Column("rdproductid")]
        public int? RDProductId { get; set; }

        [Column("docplanid")]
        public int? DocPlanId { get; set; }

        [Column("minperiodlimitmonths")]
        public int? MinPeriodLimitMonths { get; set; }

        [Column("maxperiodlimitmonths")]
        public int? MaxPeriodLimitMonths { get; set; }

    }

    [Table("RDProductInterestRules")]
    public class RDProductInterestRules
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; } = 1;

        [Column("productid")]
        public int? ProductId { get; set; }

        [Column("date", TypeName = "timestamp without time zone")]
        public DateTime? Date { get; set; }

        [Column("intratefrom")]
        public double? IntRateFrom { get; set; }

        [Column("intrateto")]
        public double? IntRateTo { get; set; }

        [Column("intvariationforaccless")]
        public double? IntVariationForAccLess { get; set; }

        [Column("intvariationforaccexceed")]
        public double? IntVariationForAccExceed { get; set; }

        [Column("intpostinginterval")]
        public int? IntPostingInterval { get; set; }

        [Column("intcompoundinginterval")]
        public int? IntCompoundingInterval { get; set; }

        [Column("actonintposting")]
        public int? ActOnIntPosting { get; set; }

        [Column("intrateonpremat")]
        public double? IntRateOnPreMat { get; set; }

        [Column("postmaturityintrate")]
        public double? PostMaturityIntRate { get; set; }

        [Column("minlockinperioddays")]
        public int? MinLockInPerioddays { get; set; }


    }

    [Table("RDProductPosting")]
    public class RDProductPosting
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; } = 1;

        [Column("rdproductid")]
        public int? RDProductId { get; set; }

        [Column("principalbalheadcode")]
        public long? PrincipalBalHeadCode { get; set; }

        [Column("intpayableheadcode")]
        public long? IntPayableHeadCode { get; set; }

    }
}
