using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    public class DayBeginEndInfoDetail
    {
        public int id { get; set; }              // Identity column
        public int branchid { get; set; }        // Part of composite key
        public int daybeginendinfoid { get; set; }
        public DateTime entrydatetime { get; set; }
        public int userid { get; set; }
        public int status { get; set; }

        // Navigation property - Many details belong to one DayBeginEndInfo
        public DayBeginEndInfo DayBeginEndInfo { get; set; } = null!;
    }
}
