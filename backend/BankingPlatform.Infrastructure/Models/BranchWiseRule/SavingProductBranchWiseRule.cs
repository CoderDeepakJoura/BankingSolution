using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.BranchWiseRule
{
    public class SavingProductBranchWiseRule
    {
        [Required]
        public int Id { get; set; }
        public int BranchId { get; set; }
        [Required]
        public int SavingProductId { get; set; }
        [Required]
        public int intexpaccount { get; set; }
        public int? depwithdrawlimitinterval { get; set; }
        public decimal? depwithdrawlimit { get; set; }

        /// <summary>365 or 360 — days in a year for interest calculation. Defaults to 365.</summary>
        public int DaysInAYear { get; set; } = 365;
    }
}
