using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.BankFD
{
    public class BankFDAccountOpeningBalance
    {
        [Key, Required, DatabaseGenerated(DatabaseGeneratedOption.Identity)] public int ID { get; set; }
        [Required] public int BranchID { get; set; }
        public int AccountId { get; set; }
        public int FDAccDetId { get; set; }
        [Column(TypeName = "decimal(18,2)")] public decimal Balance { get; set; }
        public string BalanceType { get; set; } = "Cr";
        public long? HeadCode { get; set; }
    }
}
