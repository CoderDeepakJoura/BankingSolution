namespace BankingPlatform.API.DTO.Voucher.Cash
{
    public class CashVoucherEntryDTO
    {
        public int AccountId { get; set; }
        public int AccountType { get; set; }  // 2=Saving, 3=General, 4=ShareMoney, 5=RD
        public string EntryType { get; set; } = ""; // "Cr" or "Dr"
        public decimal Amount { get; set; }
    }

    public class CashPaymentReceiptDTO
    {
        public int BrID { get; set; }
        public DateTime VoucherDate { get; set; }
        public string? VoucherNarration { get; set; }
        public int CashAccountId { get; set; }
        public List<CashVoucherEntryDTO> Entries { get; set; } = new();
    }
}
