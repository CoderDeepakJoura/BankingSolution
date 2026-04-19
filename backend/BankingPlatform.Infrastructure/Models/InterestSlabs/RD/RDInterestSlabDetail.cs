using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.InterestSlabs.RD
{
    public class RDInterestSlabDetail
    {
        [Key, Required]
        public int Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int RDIntSlabId { get; set; }       

        [Required]
        public int SlabNo { get; set; }             

        [Required]
        public decimal FromAmount { get; set; }     

        [Required]
        public decimal ToAmount { get; set; }       

        [Required]
        [MaxLength(20)]
        public string KistInterval { get; set; } = string.Empty;  

        [Required]
        public int PeriodFrom { get; set; }        

        [Required]
        public int PeriodTo { get; set; }           

        [Required]
        public decimal InterestRate { get; set; }   

    }
}
