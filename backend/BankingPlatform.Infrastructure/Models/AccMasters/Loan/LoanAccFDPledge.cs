using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.AccMasters.Loan
{
    public class LoanAccFDPledge
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int? LoanAccId { get; set; }
        public int? FDAccId { get; set; }
        public int? FDAccDetId { get; set; }
        public int? LatestStatus { get; set; }
        public DateTime? Date { get; set; }
    }

    public class LoanAccFDPledgeDetail
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int? LAccFDPledgeId { get; set; }
        public DateTime? Date { get; set; }
        public int? Status { get; set; }
    }
}