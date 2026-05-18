using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.AccMasters.Loan
{
    public class AccountKistDetail
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int AccountId { get; set; }
        public double? LoanAmountPassed { get; set; }
        public int? LoanPeriod { get; set; }
        public int? SlabId { get; set; }
        public double? StandardInterestRate { get; set; }
        public double? OverdueInterestRate { get; set; }
        public DateTime LoanDate { get; set; }
        public int? KistInterval { get; set; }
        public DateTime KistFirstDate { get; set; }
        public double? KistAmount { get; set; }
        public double? KistPrinPart { get; set; }
        public double? KistIntPart { get; set; }
        [MaxLength(20)]
        public string? LoanNo { get; set; }
        [MaxLength(2)]
        public string? KistWithInterest { get; set; }
        [MaxLength(2)]
        public string? Status { get; set; }
        public int? LoanPeriodIndays { get; set; }
        public int? KistIntervalIndays { get; set; }
        public double? KislIntAmt { get; set; }
        public double? MarginMoney { get; set; }
    }
}