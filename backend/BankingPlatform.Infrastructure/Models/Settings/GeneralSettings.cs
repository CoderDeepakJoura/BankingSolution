using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    public class GeneralSettings
    {
        [Key, Required]
        public int id { get; set; }
        [Required]
        public int branchid { get; set; }
        [Required]
        public int admissionFeeAccountId { get; set; }
        [Required]
        public decimal admissionFeeAmount { get; set; }
    }
}
