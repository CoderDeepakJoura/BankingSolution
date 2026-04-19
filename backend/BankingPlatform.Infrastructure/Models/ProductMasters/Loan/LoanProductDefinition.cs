using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Loan
{
    public class LoanProductDefinition
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("productid")]
        public int ProductId { get; set; }

        [Column("typeid")]
        public int TypeId { get; set; }

        [Column("categoryid")]
        public int? CategoryId { get; set; }

        [Column("securityids")]
        [StringLength(50)]
        public string SecurityIds { get; set; } = string.Empty;

        [Column("secreviewfreqperiod")]
        public int SecReviewFreqPeriod { get; set; }

        [Column("docplanid")]
        public int? DocPlanId { get; set; }

        [Column("intschedule")]
        public int? IntSchedule { get; set; }

        [Column("intformulae")]
        public int? IntFormulae { get; set; }

        [Column("actonintposting")]
        public int? ActOnIntPosting { get; set; }
    }
}
