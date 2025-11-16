namespace BankingPlatform.API.DTO.Voucher.Saving
{
    public class SavingVoucherDTO
    {
        public VoucherDTO? Voucher { get; set; } = new();
        public string? VoucherSubType { get; set; }
    }
}
