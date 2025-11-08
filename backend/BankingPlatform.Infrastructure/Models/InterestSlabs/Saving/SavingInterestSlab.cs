using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.Saving
{
    
    public class SavingInterestSlab
    {
        [Key, Required]
        public int Id { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required]
        public string SlabName { get; set; } = ""!;

        [Required]
        public int SavingProductId { get; set; }
        [Required]
        public DateTime ApplicableDate { get; set; }
    }
}
