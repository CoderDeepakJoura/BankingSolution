using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.Infrastructure.Models.AutoDebit
{
    /// <summary>
    /// One batch execution per branch per date.
    /// </summary>
    public class AutoDebitRun
    {
        [Key]
        public int id { get; set; }
        public int branchid { get; set; }
        public DateTime runDate { get; set; }
        public DateTime startTime { get; set; }
        public DateTime? endTime { get; set; }
        public int totalAccounts { get; set; }
        public int successCount { get; set; }
        public int failCount { get; set; }
        public string status { get; set; } = "Running"; // "Running" | "Completed" | "Failed"
        public string? telegramSent { get; set; }

        public ICollection<AutoDebitRunDetail> Details { get; set; } = new List<AutoDebitRunDetail>();
    }

    /// <summary>
    /// One row per account processed in a run.
    /// </summary>
    public class AutoDebitRunDetail
    {
        [Key]
        public int id { get; set; }
        public int runId { get; set; }
        public int branchid { get; set; }
        public int accountid { get; set; }
        public string accountType { get; set; } = "";
        public string accountNo { get; set; } = "";
        public string accountName { get; set; } = "";
        public decimal amount { get; set; }
        public string status { get; set; } = ""; // "Success" | "Failed" | "Skipped"
        public string? errorMessage { get; set; }
        public int? voucherId { get; set; }

        public AutoDebitRun Run { get; set; } = null!;
    }
}
