using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Agent
{
    public class AgentLevel
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public string code { get; set; } = "";
        public string description { get; set; } = "";
        public int? parentlevelid { get; set; }
    }
}
