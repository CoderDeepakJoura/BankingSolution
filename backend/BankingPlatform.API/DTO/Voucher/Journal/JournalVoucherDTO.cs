namespace BankingPlatform.API.DTO.Voucher.Journal
{
    public class JournalVoucherEntryDTO
    {
        public int AccountId { get; set; }
        public int AccountType { get; set; } // 2=Saving, 3=General, 4=ShareMoney, 5=RD, 6=FD
        public string EntryType { get; set; } = ""; // "Cr" or "Dr"
        public decimal Amount { get; set; }
    }

    public class JournalVoucherDTO
    {
        public int BrID { get; set; }
        public DateTime VoucherDate { get; set; }
        public string? VoucherNarration { get; set; }
        public List<JournalVoucherEntryDTO> Entries { get; set; } = new();
    }
}
