using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.BranchWiseRule
{
    public class FDProductBranchWiseRule
    {
        [Required]
        public int Id { get; set; }
        public int BranchId { get; set; }

        [Required]
        public int FDProductId { get; set; }
        [Required]
        public int InterestCalculationMethod { get; set; }
        [Required]
        public int DaysInAYear { get; set; }
        public int AccNoGeneration { get; set; }
        public int IntExpenseAccount { get; set; }
        public int ClosingChargesAccount { get; set; }
        public int IntPayableAccount { get; set; }
    }
}
