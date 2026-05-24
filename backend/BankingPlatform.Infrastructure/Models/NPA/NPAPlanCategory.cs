using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.NPA
{
    public class NPAPlanCategory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("parentid")]
        public int? ParentId { get; set; }

        // "Y" or "N"
        [Column("isgroup")]
        [StringLength(2)]
        public string? IsGroup { get; set; }

        [Column("planid")]
        public int? PlanId { get; set; }

        [Column("periodfrom")]
        public int? PeriodFrom { get; set; }

        [Column("periodto")]
        public int? PeriodTo { get; set; }

        [Column("provisioningperc")]
        public double? ProvisioningPerc { get; set; }

        [Column("intmaxperiod")]
        public int? IntMaxPeriod { get; set; }

        [Column("description")]
        [StringLength(100)]
        public string? Description { get; set; }

        [Column("descriptionsl")]
        [StringLength(100)]
        public string? DescriptionSL { get; set; }

        [Column("seqno")]
        public int? SeqNo { get; set; }

        [Column("ishoupdated")]
        public short? IsHOUpdated { get; set; }

        [Column("allprinoverdue")]
        public short AllPrinOverdue { get; set; } = 0;
    }
}
