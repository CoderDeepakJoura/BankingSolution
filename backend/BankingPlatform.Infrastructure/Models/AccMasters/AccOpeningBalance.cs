using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.AccMasters
{
    public class AccOpeningBalance
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Key]
        [Column("branchid")]
        public int BranchId { get; set; }

        [Column("accountid")]
        public int AccountId { get; set; }

        // Maps to numeric(18,2)
        [Column("openingamount", TypeName = "numeric(18,2)")]
        public decimal OpeningAmount { get; set; }

        [Column("entrytype")]
        [MaxLength(10)]
        public string EntryType { get; set; } = string.Empty;

        [Column("overdueamount", TypeName = "numeric(18,2)")]
        public decimal? OverDueAmount { get; set; } 

        [Column("openinginterest", TypeName = "numeric(18,2)")]
        public decimal? OpeningInterest { get; set; } 

        [Column("acctypeid")]
        public int? AccTypeId { get; set; } // Nullable

        [Column("overduedate")]
        public DateTime? OverDueDate { get; set; } // Nullable TIMESTAMP(3)

        [Column("openingnoofkist")]
        public int? OpeningNoOfKist { get; set; } // Nullable

        // Maps to numeric(18,2)
        [Column("fdintpayable", TypeName = "numeric(18,2)")]
        public decimal? FdIntPayable { get; set; } // Nullable

        // Maps to numeric(18,2)
        [Column("tdsamount", TypeName = "numeric(18,2)")]
        public decimal? TdsAmount { get; set; } // Nullable
    }
}
