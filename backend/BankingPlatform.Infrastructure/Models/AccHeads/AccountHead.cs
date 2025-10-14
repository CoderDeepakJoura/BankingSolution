using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.AccHeads
{
    public class AccountHead
    {
        public int id { get; set; }
        public int branchid { get; set; } = 1!;

        public string name { get; set; } = null!;

        public string? namesl { get; set; }
        public long headcode { get; set; }

        public int accountheadtypeid { get; set; }
        public int? parentid { get; set; }
        public int? isannexure { get; set; }
        public int? showinreport { get; set; }
    }
}
