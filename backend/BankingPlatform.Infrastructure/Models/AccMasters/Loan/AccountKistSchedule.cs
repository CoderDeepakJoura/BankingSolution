using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.AccMasters.Loan
{
    public class AccountKistSchedule
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int? LoanAccId { get; set; }
        public int? KistNumber { get; set; }
        public DateTime? Date { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal? KistAmount { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal? PrincipalAmt { get; set; }
        [Column(TypeName = "numeric(24,2)")]
        public decimal? InterestAmt { get; set; }
    }
}