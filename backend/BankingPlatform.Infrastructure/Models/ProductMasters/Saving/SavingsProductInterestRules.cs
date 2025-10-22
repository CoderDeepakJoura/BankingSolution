using BankingPlatform.Infrastructure.Configurations.ProductMasters.Saving;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.Saving
{
    [Table("SavingProductInterestRules")]
    public class SavingsProductInterestRules
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int SavingsProductId { get; set; }

        [Required]
        [Column(TypeName = "date")]
        public DateTime ApplicableDate { get; set; }

        /// <summary>
        /// 1=Changed Rate, 2=Fixed Rate, 3=Slab Wise Rate
        /// </summary>
        [Required]
        public int RateAppliedMethod { get; set; }

        [Required]
        [Column(TypeName = "date")]
        public DateTime IntApplicableDate { get; set; }

        /// <summary>
        /// 1=Monthly Minimum Balance, 2=Balance Method
        /// </summary>
        [Required]
        public int CalculationMethod { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal InterestRateMinValue { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal InterestRateMaxValue { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal InterestVariationMinValue { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal InterestVariationMaxValue { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinPostingIntAmt { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinBalForPosting { get; set; }

        /// <summary>
        /// 1=Daily, 2=Monthly, 3=Quarterly, 4=Half Yearly, 5=Yearly
        /// </summary>
        [Required]
        public int IntPostingInterval { get; set; }

        /// <summary>
        /// 1=Fixed Date, 2=Custom Date
        /// </summary>
        [Required]
        public int IntPostingDate { get; set; }

        /// <summary>
        /// 1=Daily, 2=Monthly, 3=Quarterly, 4=Half Yearly, 5=Yearly
        /// </summary>
        [Required]
        public int CompoundInterval { get; set; }

        /// <summary>
        /// 1=Fixed Date, 2=Custom Date
        /// </summary>
        [Required]
        public int IntCompoundDate { get; set; }

        /// <summary>
        /// 1=Stand, 2=Add In Balance
        /// </summary>
        [Required]
        public int ActionOnIntPosting { get; set; }

    }
}
