using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.FD
{
    public class FDProductPostingHeads
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

        // --- Posting Heads Columns ---
        [Required]
        [Column("principalbalheadcode")]
        public long PrincipalBalHeadCode { get; set; } // Maps to bigint

        [Required]
        [Column("suspendedbalheadcode")]
        public long SuspendedBalHeadCode { get; set; } // Maps to bigint

        [Required]
        [Column("intpayableheadcode")]
        public long IntPayableHeadCode { get; set; } // Maps to bigint
    }
}
