namespace BankingPlatform.API.DTO.Voucher.RD
{
    public class RDKistVoucherDTO
    {
        public int BrID { get; set; }
        public DateTime VoucherDate { get; set; }
        public string? VoucherNarration { get; set; }
        public int RdAccountId { get; set; }
        public decimal KistAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public int? SavingProductId { get; set; }
        public int? SavingAccountId { get; set; }
        public decimal FromSavingAmount { get; set; }
        public int? DebitAccountId { get; set; }
        public string? Agent { get; set; }
    }
}