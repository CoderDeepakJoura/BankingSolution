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

        public bool voucherPrinting { get; set; }

        public bool singleVoucherEntry { get; set; }

        [Required]
        [Range(1, 2)] // 1=Day Wise, 2=Financial Year Wise
        public int voucherNumberSetting { get; set; }

        public bool autoVerification { get; set; }

        public bool receiptNoSetting { get; set; }
    }
}
