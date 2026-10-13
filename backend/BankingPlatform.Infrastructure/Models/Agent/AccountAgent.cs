using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Agent
{
    public class AccountAgent
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int accountid { get; set; }
        public int acctype { get; set; }
        public int agentid { get; set; }
        public DateTime fromdate { get; set; }
        public DateTime? todate { get; set; }
    }
}
