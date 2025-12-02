using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.FD
{
    public class FDInterestSlabDetail
    {
        [Key, Required]
        public int Id { get; set; }
        [Required]
        public int BranchId { get; set; }
        public int FDIntSlabInfoId { get; set; }
        public int FDIntSlabId { get; set; }
        [Required]
        public decimal AgeFrom { get; set; }
        [Required]
        public decimal AgeTo { get; set; }
        [Required]
        public decimal InterestRate { get; set; }
    }
}
