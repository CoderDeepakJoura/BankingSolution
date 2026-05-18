using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.AccMasters.Loan
{
    public class LoanAccRDPledge
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int? LoanAccId { get; set; }
        public int? RDAccId { get; set; }
        public int? RDAccDetId { get; set; }
        public int? LatestStatus { get; set; }
        public DateTime? Date { get; set; }
    }

    public class LoanAccRDPledgeDetail
    {
        [Key]
        public int Id { get; set; }
        public int BrId { get; set; }
        public int? LAccRDPledgeId { get; set; }
        public DateTime? Date { get; set; }
        public int? Status { get; set; }
        public short? IsHOUpdated { get; set; }
    }
}