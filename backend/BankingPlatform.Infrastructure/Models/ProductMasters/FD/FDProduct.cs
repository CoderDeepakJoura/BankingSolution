using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.ProductMasters.FD
{
    public class FDProduct
    {
        // --- Composite Primary Key ---
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("branchid")]
        public int BranchId { get; set; } = 1;

        // --- Core Columns ---
        [Required]
        [Column("productname")]
        [StringLength(255)]
        public string ProductName { get; set; } = string.Empty;

        [Required]
        [Column("productcode")]
        [StringLength(10)]
        public string ProductCode { get; set; } = string.Empty;

        [Required]
        [Column("effectivefrom", TypeName = "timestamp without time zone")]
        public DateTime EffectiveFrom { get; set; }

        [Column("effectivetill", TypeName = "timestamp without time zone")]
        public DateTime? EffectiveTill { get; set; } // Nullable

        [Column("isseparatefdaccountallowed")]
        public bool? IsSeparateFdAccountAllowed { get; set; } // Maps to boolean
    }
}
