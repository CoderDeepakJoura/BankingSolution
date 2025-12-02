using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.FD
{
    
    public class FDInterestSlab
    {
        [Key, Required]
        public int Id { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required]
        public string SlabName { get; set; } = ""!;

        [Required]
        public int FDProductId { get; set; }
        [Required]
        public int FromDays { get; set; }
        [Required]
        public int ToDays { get; set; }
        [Required]
        public int CompoundingInterval { get; set; }
    }
}
