using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
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
        [Required]
        public int defaultCashAccountId { get; set; }

        [Required]
        [Range(18, 100)]
        public int minimumMemberAge { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        [Range(0, 100)]
        public decimal shareMoneyPercentageForLoan { get; set; }

        public bool bankFDMaturityReminder { get; set; }
        public int ? bankFDMaturityReminderDays { get; set; }
    }
}
