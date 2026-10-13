using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    public class SuperUserSettings
    {
        [Key, Required]
        public int id { get; set; }
        [Required]
        public int branchid { get; set; }

        public bool allowSavingInterestChange { get; set; }
        public bool allowFDInterestChange { get; set; }
        public bool allowRDInterestChange { get; set; }
        public bool allowLoanInterestChange { get; set; }
        public bool enableIBTransactions { get; set; } = true;
        public bool allowGSTDeduction { get; set; } = true;
        public bool showBankFDModule { get; set; } = false;
        public bool showPayrollModule { get; set; } = false;
        public bool showAgentModule { get; set; } = false;
        public bool enforceSingleSession { get; set; } = false;
        public string? telegramchatid { get; set; }

        // Auto-Debit
        public bool enableAutoDebit { get; set; } = false;
        public int autoDebitRunHour { get; set; } = 2;
        public int autoDebitRunMinute { get; set; } = 0;
        public bool autoDebitProcessRdKist { get; set; } = true;
        public bool autoDebitProcessLoanRecovery { get; set; } = true;
    }
}
