using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    public class DayBeginEndInfo
    {
        public int id { get; set; }             // Identity column
        public int branchid { get; set; }       // Part of composite key
        public DateTime workingdate { get; set; }
        public int lateststatus { get; set; }
        public string remarks { get; set; } = string.Empty;

        // Navigation property - One DayBeginEndInfo can have many details
        public ICollection<DayBeginEndInfoDetail> Details { get; set; } = new List<DayBeginEndInfoDetail>();
    }
}
