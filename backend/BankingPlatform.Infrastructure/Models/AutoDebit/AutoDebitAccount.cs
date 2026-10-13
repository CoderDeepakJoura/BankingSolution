using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.AutoDebit
{
    /// <summary>
    /// Per-account mandate — operator enrolls an account for auto-debit.
    /// </summary>
    public class AutoDebitAccount
    {
        [Key]
        public int id { get; set; }
        public int branchid { get; set; }
        public int accountid { get; set; }
        public string accounttype { get; set; } = ""; // "RDKist" | "LoanRecovery"
        public bool isactive { get; set; } = true;
        public DateTime createdAt { get; set; } = DateTime.Now;
        public string? notes { get; set; }
        public int? savingaccountid { get; set; }
    }
}
