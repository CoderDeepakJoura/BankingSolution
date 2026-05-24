using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.GST
{
    [Table("taxgroup")]
    public class TaxGroup
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("description")]
        [StringLength(50)]
        public string? Description { get; set; }

        [Column("descriptionsl")]
        [StringLength(50)]
        public string? DescriptionSL { get; set; }

        [Column("code")]
        [StringLength(10)]
        public string? Code { get; set; }

        // 1=Format1, 2=Format2
        [Column("printingformat")]
        public int? PrintingFormat { get; set; }

        [Column("isstatmandatory")]
        public bool IsStateMandatory { get; set; }

        [Column("isshippingmandatory")]
        public bool IsShippingMandatory { get; set; }

        [Column("isbillingmandatory")]
        public bool IsBillingMandatory { get; set; }
    }

    [Table("taxgrouptype")]
    public class TaxGroupType
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("taxgroupid")]
        public int TaxGroupId { get; set; }

        [Column("taxtypeid")]
        public int TaxTypeId { get; set; }
    }
}
