using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.GST
{
    [Table("tax")]
    public class Tax
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("name")]
        [StringLength(100)]
        public string? Name { get; set; }

        [Column("namesl")]
        [StringLength(100)]
        public string? NameSL { get; set; }

        [Column("taxcode")]
        public int TaxCode { get; set; }

        [Column("introductiondate", TypeName = "date")]
        public DateTime IntroductionDate { get; set; }

        [Column("taxaccountid")]
        public int TaxAccountId { get; set; }

        [Column("alias")]
        [StringLength(30)]
        public string? Alias { get; set; }

        [Column("aliassl")]
        [StringLength(50)]
        public string? AliasSL { get; set; }

        [Column("taxpercentage")]
        public float TaxPercentage { get; set; }

        [Column("parenttaxid")]
        public int ParentTaxId { get; set; }

        [Column("evaluatedon")]
        public int EvaluatedOn { get; set; } = 1;

        [Column("oldtaxid")]
        public int OldTaxId { get; set; }

        // Tax Category: 1=Taxable, 2=Nil Rated, 3=Exempted
        [Column("tcid")]
        public int TCId { get; set; }

        [Column("taxgroupid")]
        public int? TaxGroupId { get; set; }
    }

    [Table("taxdetail")]
    public class TaxDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("taxid")]
        public int TaxId { get; set; }

        [Column("detaildate", TypeName = "date")]
        public DateTime DetailDate { get; set; }

        [Column("taxtypeid")]
        public int TaxTypeId { get; set; }

        [Column("nratio")]
        public float NRatio { get; set; } = 1;

        [Column("dratio")]
        public float DRatio { get; set; } = 1;

        // 1=GrossAmount, 2=ParentTax
        [Column("evaluatedon")]
        public int EvaluatedOn { get; set; } = 1;

        [Column("percentage")]
        public float Percentage { get; set; }
    }
}
