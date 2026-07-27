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
    }
}
