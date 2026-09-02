using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.BankFD
{
    public class BankFDInterestIncomeSetting
    {
        [Key, Required, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID { get; set; }
        [Required]
        public int BrId { get; set; }
        public long HeadCode { get; set; }
        public int IntIncomeAccId { get; set; }
    }
}
