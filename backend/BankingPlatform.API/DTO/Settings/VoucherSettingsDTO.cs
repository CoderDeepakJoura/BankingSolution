namespace BankingPlatform.API.DTO.Settings
{
    public class VoucherSettingsDTO
    {
        public VoucherSettingsDTO() { }

        public VoucherSettingsDTO(int branchId, bool autoVerification)
        {
            AutoVerification = autoVerification;
        }

        [Required]
        public bool AutoVerification { get; set; } = false;
    }
}
