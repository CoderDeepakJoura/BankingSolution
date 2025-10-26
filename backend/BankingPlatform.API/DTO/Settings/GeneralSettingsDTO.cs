namespace BankingPlatform.API.DTO.Settings
{
    public class GeneralSettingsDTO
    {
        [Required]
        public int BranchId { get; set; }

        public int AdmissionFeeAccountId { get; set; }
        public decimal AdmissionFeeAmount { get; set; }

        public string? AdmissionFeeAccName { get; set; }

        public int DefaultCashAccountId { get; set; }
        public int MinimumMemberAge { get; set; }
        public decimal ShareMoneyPercentageForLoan { get; set; }
        public bool BankFDMaturityReminder { get; set; }
        public int? BankFDMaturityReminderDays { get; set; }
    }

}
