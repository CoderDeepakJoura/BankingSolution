using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    public class TDSSettings
    {
        [Key, Required]
        public int id { get; set; }

        [Required]
        public int branchid { get; set; }

        public bool bankFDTDSApplicability { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        [Range(0, 100)]
        public decimal bankFDTDSRate { get; set; }

        [Range(1, 5)] // 1=Maturity, 2=Monthly, 3=Quarterly, 4=Yearly, 5=Interest Posting
        public int bankFDTDSDeductionFrequency { get; set; }

        public int bankFDTDSLedgerAccountId { get; set; }
    }
}
