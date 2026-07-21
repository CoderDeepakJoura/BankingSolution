using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.AccMasters
{
    public class FDAccountDetail
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("branchid")]
        public int BranchId { get; set; }

        [Required]
        [Column("accountid")]
        public int AccountId { get; set; }

        [Required]
        [Column("fdamount", TypeName = "numeric(18,2)")]
        public decimal FDAmount { get; set; }

        [Required]
        [Column("fddate")]
        public DateTime FDDate { get; set; }

        [Required]
        [Column("fdmaturitydate")]
        public DateTime FDMaturityDate { get; set; }

        [Required]
        [Column("maturityamount", TypeName = "numeric(18,2)")]
        public decimal MaturityAmount { get; set; }

        [Required]
        [Column("ltdno")]
        public int LTDNo { get; set; }

        [Required]
        [Column("fdstatus")]
        public int FDStatus { get; set; }

        [Required]
        [Column("fdperiodmonths")]
        public int FDPeriodMonths { get; set; }

        [Required]
        [Column("fdperioddays")]
        public int FDPeriodDays { get; set; }

        [Column("slabid")]
        public int? SlabId { get; set; }

        [Required]
        [Column("intrate", TypeName = "numeric(18,4)")]
        public decimal IntRate { get; set; }

        [Required]
        [Column("intcompinterval")]
        public int IntCompInterval { get; set; }

        [Required]
        [Column("serialno")]
        public int SerialNo { get; set; }

        [Required]
        [Column("voucherdate")]
        public DateTime VoucherDate { get; set; }

        [Column("interestpaidinterval")]
        public int? InterestPaidInterval { get; set; }

        [Column("interestpaidamount", TypeName = "numeric(18,2)")]
        public decimal? InterestPaidAmount { get; set; }

        [Column("misaccid")]
        public int? MISAccId { get; set; }

        [Column("openingbalance", TypeName = "numeric(18,2)")]
        public decimal? OpeningBalance { get; set; }

        [Column("openingbalancetype")]
        [MaxLength(5)]
        public string? OpeningBalanceType { get; set; }
    }
}
