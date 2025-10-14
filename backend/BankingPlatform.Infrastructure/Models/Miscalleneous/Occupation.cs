using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    public class Occupation
    {
        public int id { get; set; }
        public int branchid { get; set; } = 1!;

        public string description { get; set; } = null!;

        public string? descriptionsl { get; set; }
    }
}
