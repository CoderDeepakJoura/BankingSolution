namespace BankingPlatform.API.DTO.Voucher
{
    public class VoucherCreditDebitDetailsDTO
    {
        public int Id { get; set; }
        public int BrId { get; set; }

        // Foreign Key to Voucher (Header)
        public int VoucherID { get; set; }

        // Account Details
        public int AccountId { get; set; }
        public long AccHeadCode { get; set; }

        // Transaction Details
        public decimal VoucherAmount { get; set; }
        public string VoucherEntryType { get; set; } = string.Empty;

        // Narration and Status
        public string? Narration { get; set; }
        public string EntryStatus { get; set; } = string.Empty;

        public DateTime ValueDate { get; set; }
        public int VoucherSeqNo { get; set; }

        // Financial/Calculated Fields
        public decimal? IntDr { get; set; }
        public decimal? IntCr { get; set; }
        public decimal? ExpenseAmt { get; set; }

        // System and Audit Fields
        public string? VoucherStatus { get; set; }

        public int HCL1 { get; set; }
        public int HCL2 { get; set; }
        public int HCL3 { get; set; }
    }
}
