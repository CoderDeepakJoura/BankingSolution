using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.FD
{
    public class FDProductInterestRules
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Key]
        [Column("branchid")]
        public int BranchId { get; set; } = 1;

        // --- Foreign Key to FdProduct ---
        [Column("productid")]
        public int ProductId { get; set; }

        // --- Rules Columns ---
        [Required]
        [Column("applicabledate", TypeName = "timestamp without time zone")]
        public DateTime ApplicableDate { get; set; }

        [Column("interestapplicableon")]
        [Required]
        public int InterestApplicableOn { get; set; }

        [Column("interestrateminvalue")]
        [Required]
        public int InterestRateMinValue { get; set; }

        [Column("interestratemaxvalue")]
        [Required]
        public int InterestRateMaxValue { get; set; }

        [Column("interestvariationminvalue")]
        [Required]
        public int InterestVariationMinValue { get; set; }

        [Column("interestvariationmaxvalue")]
        [Required]
        public int InterestVariationMaxValue { get; set; }

        [Column("actiononintposting")]
        [Required]
        public short ActionOnIntPosting { get; set; } // Maps to smallint

        [Column("postmaturityintratecalculationtype")]
        [Required]
        public short PostMaturityIntRateCalculationType { get; set; } // Maps to smallint

        [Column("prematuritycalculationtype")]
        [Required]
        public short PrematurityCalculationType { get; set; } // Maps to smallint

        [Column("maturityduenoticeindays")]
        public int MaturityDueNoticeInDays { get; set; }

        [Column("intpostinginterval")]
        [Required]
        public int IntPostingInterval { get; set; }

        [Column("intpostingdate")]
        [Required]
        public int IntPostingDate { get; set; }
    }
}
