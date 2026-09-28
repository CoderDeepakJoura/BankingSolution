using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Settings
{
    [Table("receiptnotracker")]
    public class ReceiptNoTracker
    {
        [Key]
        public int id { get; set; }

        public int brid { get; set; }

        public int lastReceiptNo { get; set; } = 0;
    }
}
