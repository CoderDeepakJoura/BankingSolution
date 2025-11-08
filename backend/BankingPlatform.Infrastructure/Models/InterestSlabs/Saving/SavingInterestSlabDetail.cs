using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.Saving
{
    public class SavingInterestSlabDetail
    {
        [Key, Required]
        public int Id { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required]
        public int savingintslabId { get; set; }
        [Required]
        public decimal fromamount { get; set; }
        [Required]
        public decimal toamount { get; set; }
        [Required]
        public decimal interestrate { get; set; }
    }
}
