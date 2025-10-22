using BankingPlatform.Infrastructure.Configurations.ProductMasters.Saving;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Saving
{
    [Table("SavingProductRules")]
    public class SavingsProductRules
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int SavingsProductId { get; set; }

        /// <summary>
        /// 1=Monthly, 2=Quarterly, 3=Half-Yearly, 4=Yearly, 5=On Demand
        /// </summary>
        [Required]
        public int AcStatementFrequency { get; set; }

        [Required]
        public int AcRetentionDays { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinBalanceAmt { get; set; }

        [Required]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? ModifiedDate { get; set; }

    }
}
