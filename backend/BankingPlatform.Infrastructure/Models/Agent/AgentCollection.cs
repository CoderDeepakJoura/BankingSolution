using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Agent
{
    public class AgentCollection
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int agentid { get; set; }
        public int accountid { get; set; }
        public string acctype { get; set; } = "";   // "RD" | "Saving" | "Loan"
        public decimal amount { get; set; }
        public DateTime collectiondate { get; set; }
        public bool isposted { get; set; } = false;
        public int? voucherid { get; set; }
        public string? notes { get; set; }
        public DateTime createdat { get; set; } = DateTime.Now;
    }
}
