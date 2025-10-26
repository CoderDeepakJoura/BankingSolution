namespace BankingPlatform.API.DTO.Settings
{
    public class VoucherSettingsDTO
    {
        public int BranchId { get; set; }
        public bool VoucherPrinting { get; set; }
        public bool SingleVoucherEntry { get; set; }
        public int VoucherNumberSetting { get; set; }
        public bool AutoVerification { get; set; }
        public bool ReceiptNoSetting { get; set; }
    }
}
