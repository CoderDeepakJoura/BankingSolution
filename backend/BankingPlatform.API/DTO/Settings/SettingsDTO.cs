namespace BankingPlatform.API.DTO.Settings
{
    public class SettingsDTO
    {
        public GeneralSettingsDTO GeneralSettings { get; set; } = new GeneralSettingsDTO();
        public AccountSettingsDTO? AccountSettings { get; set; }
        public VoucherSettingsDTO VoucherSettings { get; set; } = new VoucherSettingsDTO();
        public TDSSettingsDTO? TDSSettings { get; set; }
        public PrintingSettingsDTO? PrintingSettings { get; set; }
    }

    public class AccountSettingsDTO
    {
        public int BranchId { get; set; }
        public bool AccountVerification { get; set; }
        public bool MemberKYC { get; set; }
        public int SavingAccountLength { get; set; }
        public int LoanAccountLength { get; set; }
        public int FDAccountLength { get; set; }
        public int RDAccountLength { get; set; }
        public int ShareAccountLength { get; set; }
    }

    public class TDSSettingsDTO
    {
        public int BranchId { get; set; }
        public bool BankFDTDSApplicability { get; set; }
        public decimal BankFDTDSRate { get; set; }
        public int BankFDTDSDeductionFrequency { get; set; }
        public int BankFDTDSLedgerAccountId { get; set; }
    }

    // Printing Settings DTO
    public class PrintingSettingsDTO
    {
        public int BranchId { get; set; }
        public bool FDReceiptSetting { get; set; }
        public bool RDCertificateSetting { get; set; }
    }
}
