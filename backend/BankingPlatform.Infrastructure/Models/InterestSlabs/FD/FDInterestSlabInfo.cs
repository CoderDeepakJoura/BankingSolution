using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.FD
{
    public class FDInterestSlabInfo
    {
        [Key, Required]
        public int Id { get; set; }
        [Required]
        public int BranchId { get; set; }

        [Required]
        public int FDProductId { get; set; }
        [Required]
        public DateTime ApplicableDate { get; set; }
       
    }
}
