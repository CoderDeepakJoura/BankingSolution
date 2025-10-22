using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.FD
{
    public class FDProductRules
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Key]
        [Column("branchid")]
        public int BranchId { get; set; } = 1;

        // --- Foreign Key to FdProduct ---
        [Column("productid")]
        public int ProductId { get; set; }

        // --- Rules Columns ---
        [Column("intaccounttype")]
        public int IntAccountType { get; set; }

        [Column("fdmaturityreminderinmonths")]
        public int? FdMaturityReminderInMonths { get; set; }

        [Column("fdmaturityreminderindays")]
        public int? FdMaturityReminderInDays { get; set; }
    }
}
