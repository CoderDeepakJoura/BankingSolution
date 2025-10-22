using BankingPlatform.Infrastructure.Configurations.ProductMasters.Saving;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Saving
{
    [Table("SavingProductPostingHeads")]
    public class SavingsProductPostingHeads
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int SavingsProductId { get; set; }

        [Required]
        public int PrincipalBalHeadCode { get; set; }

        [Required]
        public int SuspendedBalHeadCode { get; set; }

        [Required]
        public int IntPayableHeadCode { get; set; }
    }
}
