using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.BranchWiseRule
{
    [Table("rdproductbranchwiserule")]
    public class RDProductBranchWiseRule
    {
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        [Required]
        public int BrId { get; set; }

        [Column("rdproductid")]
        [Required]
        public int RDProductId { get; set; }

        [Column("intformula")]
        [Required]
        public int IntFormula { get; set; }

        [Column("accnogeneration")]
        [MaxLength(2)]
        public string? AccNoGeneration { get; set; }

        [Column("printcertificate")]
        public short? PrintCertificate { get; set; }

        [Column("intexpaccid")]
        public int? IntExpAccId { get; set; }

        [Column("penaltyincaccid")]
        public int? PenaltyIncAccId { get; set; }

        [Column("closingchargesacc")]
        public int? ClosingChargesAcc { get; set; }

        [Column("kistaftermaturity")]
        public short? KistAfterMaturity { get; set; }

        [Column("paymentdatetype")]
        public short? PaymentDateType { get; set; }

        [Column("noofdayormonth")]
        public int? NoOfDayOrMonth { get; set; }
    }
}
