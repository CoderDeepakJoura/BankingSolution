namespace BankingPlatform.API.DTO.Settings
{
    public class SettingsDTO
    {
        public GeneralSettingsDTO GeneralSettings { get; set; } = new GeneralSettingsDTO();
        public VoucherSettingsDTO VoucherSettings { get; set; } = new VoucherSettingsDTO();
    }
}
