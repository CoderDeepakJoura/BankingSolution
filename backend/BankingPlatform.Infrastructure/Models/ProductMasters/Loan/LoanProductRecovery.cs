using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Loan
{
    public class LoanProductRecovery
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("productid")]
        public int ProductId { get; set; }

        [Required]
        [Column("recoverymode")]
        [StringLength(50)]
        public string RecoveryMode { get; set; } = string.Empty;

        [Required]
        [Column("recoveryseq")]
        [StringLength(50)]
        public string RecoverySeq { get; set; } = "1,2,3,4";

        [Column("minballeftlimit")]
        public double MinBalLeftLimit { get; set; }

        [Column("minbalgivenlimit")]
        public double MinBalGivenLimit { get; set; }

        [Column("applyovrinton")]
        [StringLength(5)]
        public string? ApplyOvrIntOn { get; set; }

        [Column("intrecoveredinadvance")]
        public short? IntRecoveredInAdvance { get; set; }

        [Column("intpostinginterval")]
        public int? IntPostingInterval { get; set; }

        [Column("stdoverdueonkistdate")]
        public short? StdOverdueOnKistDate { get; set; }

        [Column("recoveryadjustmentseq")]
        public int RecoveryAdjustmentSeq { get; set; } = 1;
    }
}
