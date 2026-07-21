namespace BankingPlatform.API.DTO.Voucher.Loan
{
    public class LoanAdvancementCreditItemDTO
    {
        public int AccountId { get; set; }
        public int AccountType { get; set; }
        public decimal Amount { get; set; }
        public string? Narration { get; set; }
        public GSTDetailDTO? GstDetail { get; set; }
    }

    public class LoanAdvancementVoucherDTO
    {
        public int BrId { get; set; }
        public DateTime VoucherDate { get; set; }
        public int LoanAccountId { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Narration { get; set; }
        public List<LoanAdvancementCreditItemDTO> CreditItems { get; set; } = new();
    }
}
