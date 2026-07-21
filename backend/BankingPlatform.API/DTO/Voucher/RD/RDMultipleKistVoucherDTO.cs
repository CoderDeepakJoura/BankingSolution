namespace BankingPlatform.API.DTO.Voucher.RD
{
    public class RDMultipleKistItemDTO
    {
        public int RdAccountId { get; set; }
        public decimal KistAmount { get; set; }
    }

    public class RDMultipleKistVoucherDTO
    {
        public int BrID { get; set; }
        public DateTime VoucherDate { get; set; }
        public string? VoucherNarration { get; set; }
        public int DebitAccountId { get; set; }
        public List<RDMultipleKistItemDTO> Items { get; set; } = new();
    }
}
