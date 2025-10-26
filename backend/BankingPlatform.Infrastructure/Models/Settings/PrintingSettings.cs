using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    public class PrintingSettings
    {
        [Key, Required]
        public int id { get; set; }

        [Required]
        public int branchid { get; set; }

        public bool fdReceiptSetting { get; set; }

        public bool rdCertificateSetting { get; set; }
    }
}
