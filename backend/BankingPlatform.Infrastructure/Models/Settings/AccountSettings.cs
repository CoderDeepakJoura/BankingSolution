using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    public class AccountSettings
    {
        [Key, Required]
        public int id { get; set; }

        [Required]
        public int branchid { get; set; }

        public bool accountVerification { get; set; }

        public bool memberKYC { get; set; }

        [Required]
        [Range(5, 20)]
        public int savingAccountLength { get; set; }

        [Required]
        [Range(5, 20)]
        public int loanAccountLength { get; set; }

        [Required]
        [Range(5, 20)]
        public int fdAccountLength { get; set; }

        [Required]
        [Range(5, 20)]
        public int rdAccountLength { get; set; }

        [Required]
        [Range(5, 20)]
        public int shareAccountLength { get; set; }

    }
}
