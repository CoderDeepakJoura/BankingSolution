namespace BankingPlatform.API.DTO.AccountMasters
{
    public class FDAccountDetailDTO
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Branch ID is required")]
        public int BranchId { get; set; }
        public int? AccountId { get; set; }

        [Required(ErrorMessage = "FD Amount is required")]
        [Range(0.01, double.MaxValue, ErrorMessage = "FD Amount must be greater than 0")]
        public decimal FDAmount { get; set; }

        [Required(ErrorMessage = "FD Date is required")]
        public DateTime FDDate { get; set; }

        [Required(ErrorMessage = "Maturity Date is required")]
        public DateTime FDMaturityDate { get; set; }

        [Required(ErrorMessage = "Maturity Amount is required")]
        public decimal MaturityAmount { get; set; }

        public string LTDNo { get; set; } = "";

        [Required(ErrorMessage = "FD Status is required")]
        public int FDStatus { get; set; }

        [Required(ErrorMessage = "Period in months is required")]
        [Range(0, 1200, ErrorMessage = "Period must be between 0 and 1200 months")]
        public int FDPeriodMonths { get; set; }

        [Required(ErrorMessage = "Period in days is required")]
        [Range(0, 365, ErrorMessage = "Days must be between 0 and 365")]
        public int FDPeriodDays { get; set; }

        [Required(ErrorMessage = "Interest Slab is required")]
        public int SlabId { get; set; }

        [Required(ErrorMessage = "Interest Rate is required")]
        [Range(0.01, 100, ErrorMessage = "Interest rate must be between 0.01 and 100")]
        public decimal IntRate { get; set; }

        [Required(ErrorMessage = "Compounding Interval is required")]
        public int IntCompInterval { get; set; }

        [StringLength(20)]
        public string CompoundingInterval { get; set; } = ""; // "Monthly", "Quarterly", etc.

        public int SerialNo { get; set; }

        [Required(ErrorMessage = "Voucher Date is required")]
        public DateTime VoucherDate { get; set; }

        [StringLength(50)]
        public string ReceiptNo { get; set; }

        public int? InterestPaidInterval { get; set; }

        public decimal? InterestPaidAmount { get; set; }

        public int? MISAccId { get; set; }



    }
}
