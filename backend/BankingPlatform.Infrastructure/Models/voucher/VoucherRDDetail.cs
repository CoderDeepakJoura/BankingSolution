using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.voucher
{
    public class VoucherRDDetail
    {
        public int Id { get; set; }
        public int BrId { get; set; }
        public int VaccCrDrId { get; set; }
        public int RdAccId { get; set; }
        public int RdAccDetId { get; set; }
        public double AmountCr { get; set; }
        public double AmountDr { get; set; }
        public string Operation { get; set; } = string.Empty;
        public DateTime? ValueDate { get; set; }
        public DateTime? VoucherDate { get; set; }
        public int? OthRefAccId { get; set; }
        public decimal? PenalAmt { get; set; }
        public int? PenalAccId { get; set; }
        public double? IntDr { get; set; }
        public double? IntCr { get; set; }
        public string? VoucherMainStatus { get; set; }
        public int VoucherId { get; set; }
    }
}
