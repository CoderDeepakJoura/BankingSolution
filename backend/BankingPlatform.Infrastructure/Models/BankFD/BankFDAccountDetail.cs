using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.BankFD
{
    public class BankFDAccountDetail
    {
        [Key, Required, DatabaseGenerated(DatabaseGeneratedOption.Identity)] public int ID { get; set; }
        [Required] public int BrId { get; set; }
        public int AccId { get; set; }
        [Column(TypeName = "decimal(18,2)")] public decimal FDAmount { get; set; }
        public DateTime FDDate { get; set; }
        public DateTime FDMaturityDate { get; set; }
        [Column(TypeName = "decimal(18,2)")] public decimal MaturityAmount { get; set; }
        public string LTDNo { get; set; } = "";
        public int FDStatus { get; set; } = 1;
        public int FDPeriodMonths { get; set; }
        public int FDPeriodDays { get; set; }
        public double IntRate { get; set; }
        public int IntCompInterval { get; set; } = 1;
        [Column(TypeName = "decimal(18,0)")] public decimal? SerialNo { get; set; }
    }
}
