using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Agent
{
    public class AgentLogin
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int agentmasterid { get; set; }
        public string username { get; set; } = "";
        public string passwordhash { get; set; } = "";
        public bool issuperagent { get; set; } = false;
        public bool isactive { get; set; } = true;
        public string? refreshtoken { get; set; }
        public DateTime? refreshtokenexpiry { get; set; }
        public DateTime createdat { get; set; } = DateTime.Now;
    }
}
