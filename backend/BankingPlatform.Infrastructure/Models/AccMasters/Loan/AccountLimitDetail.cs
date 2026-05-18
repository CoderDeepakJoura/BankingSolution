using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.AccMasters.Loan
{
    public class AccountLimitDetail
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int AccountId { get; set; }
        [Required, MaxLength(20)]
        public string LoanNo { get; set; } = string.Empty;
        public DateTime LoanDate { get; set; }
        public double LoanAmountPassed { get; set; }
        public int LoanLimitPeriodInMonths { get; set; }
        public int LoanLimitPeriodInDays { get; set; }
        public int SlabId { get; set; }
        public double StandardInterestRate { get; set; }
        public double OverdueInterestRate { get; set; }
    }
}