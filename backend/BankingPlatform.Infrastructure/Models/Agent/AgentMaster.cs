using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Agent
{
    public class AgentMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public string code { get; set; } = "";
        public string name { get; set; } = "";
        public int? agentlevelid { get; set; }
        public string phone { get; set; } = "";
        public string address { get; set; } = "";
        public bool isactive { get; set; } = true;
    }
}
