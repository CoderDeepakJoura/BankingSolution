using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.AccMasters
{
    public class RDAccountDetail
    {
        public int Id { get; set; }
        public int BrId { get; set; }
        public int? AccId { get; set; }
        public int? RdNumber { get; set; }
        public DateTime RdDate { get; set; }
        public decimal RdAmount { get; set; }
        public int? NoOfMonths { get; set; }
        public int? RdSlabId { get; set; }
        public double? InterestRate { get; set; }
        public DateTime? MaturityDate { get; set; }
        public decimal? KistAmt { get; set; }
        public int? KistInterval { get; set; }
        public DateTime? FirstKistDate { get; set; }
        public decimal? PenaltyAmt { get; set; }
        public int? Status { get; set; }
        public decimal? MaturityAmt { get; set; }
        public int? NoOfDays { get; set; }
        public int? CompoundingInterval { get; set; }
        public DateTime? MaturedOn { get; set; }
        public DateTime? PreMaturedOn { get; set; }
    }
}
