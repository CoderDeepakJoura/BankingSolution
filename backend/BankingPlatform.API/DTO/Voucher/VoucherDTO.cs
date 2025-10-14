namespace BankingPlatform.API.DTO.Voucher
{
    public class VoucherDTO
    {
        public int Id { get; set; }
        public int BrID { get; set; }

        // Voucher Identification
        public int VoucherNo { get; set; }
        public int VoucherType { get; set; }
        public int VoucherSubType { get; set; }

        // Date and Time
        public DateTime VoucherDate { get; set; }
        public DateTime? ActualTime { get; set; }

        // Narration and Status
        public string? VoucherNarration { get; set; }
        public string VoucherStatus { get; set; } = string.Empty;

        // Audit and Verification
        public int? AddedBy { get; set; }
        public int? ModifiedBy { get; set; }
        public int? VerifiedBy { get; set; }

        // System Synchronization
        public int? OtherBrID { get; set; }

        public decimal? TotalDebit { get; set; }
        public decimal? admissionFeeAmount { get; set; }
        public decimal? smAmount { get; set; }

        public string? admissionFeesAccount { get; set; }
        public int? admissionFeesAccountId { get; set; }
        public string? DebitAccountName { get; set; } = ""!;
        public int? DebitAccountId { get; set; } = 0;
        public decimal? OpeningAmount { get; set; } = 0;

        // Optional: If you want to expose Credit/Debit details
        //public List<VoucherCreditDebitDetailsDTO>? CreditDebitDetails { get; set; }
    }

}
