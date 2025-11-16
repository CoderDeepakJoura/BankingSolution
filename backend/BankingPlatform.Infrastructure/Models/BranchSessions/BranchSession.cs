using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.BranchSessions
{
    public class BranchSession
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int sessionfrom { get; set; }
        public int sessionto { get; set; }
        public DateTime fromdate { get; set; }
        public DateTime todate { get; set; }
        public bool iscurrent { get; set; }
        public bool isfirst { get; set; }

    }
}
