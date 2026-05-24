using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.NPA
{
    public class NPAPlanMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Required]
        [Column("code")]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Column("description")]
        [StringLength(500)]
        public string? Description { get; set; }

        [Column("ishoupdated")]
        public short? IsHOUpdated { get; set; }

        // 0=Overdue Date, 1=Loan Date, 2=Last Installment Date
        [Column("calnpadate")]
        public int CalNPADate { get; set; } = 0;

        // 1=Overdue Period, 2=Overdue Instalments
        [Column("ovrduePeriodorinst")]
        public int OvrDuePeriodOrInst { get; set; } = 1;

        [Column("calnpafromloandate")]
        public short CalNPAFromLoanDate { get; set; } = 0;
    }
}
