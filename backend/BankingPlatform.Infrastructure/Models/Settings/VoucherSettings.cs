using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    public class VoucherSettings
    {
        [Key, Required]
        public int id { get; set; }
        [Required]
        public int branchid { get; set; }
        [Required]
        public bool autoverification { get; set; }
    }
}
