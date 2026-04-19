using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Loan
{
    public class LoanProductPosting
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("productid")]
        public int ProductId { get; set; }

        [Column("principalbalheadcode")]
        public long PrincipalBalHeadCode { get; set; }

        [Column("miscincheadcode")]
        public long MiscIncHeadCode { get; set; }

        [Column("minballeftlimitheadcode")]
        public long MinBalLeftLimitHeadCode { get; set; }

        [Column("minbalgivenlimitheadcode")]
        public long MinBalGivenLimitHeadCode { get; set; }

        [Column("expheadcode")]
        public long ExpHeadCode { get; set; }

        [Column("recoverableintHeadcode")]
        public long? RecoverableIntHeadCode { get; set; }
    }
}
