using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.AccMasters.Loan
{
    [Table("loanguarwitness")]
    public class LoanGuarWitness
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("loanaccid")]
        public int? LoanAccId { get; set; }

        [Column("date")]
        public DateTime? Date { get; set; }

        [Column("guar1memid")]
        public int? Guar1MemId { get; set; }

        [Column("guar1membrid")]
        public int Guar1MemBrId { get; set; }

        [Column("guar2memid")]
        public int? Guar2MemId { get; set; }

        [Column("guar2membrid")]
        public int Guar2MemBrId { get; set; }

        [Column("witness1memid")]
        public int? Witness1MemId { get; set; }

        [Column("wit1membrid")]
        public int? Wit1MemBrId { get; set; }

        [Column("witness2memid")]
        public int? Witness2MemId { get; set; }

        [Column("wit2membrid")]
        public int Wit2MemBrId { get; set; }
    }
}