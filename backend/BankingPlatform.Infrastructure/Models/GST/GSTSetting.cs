using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.GST
{
    public class GSTSetting
    {
        [Key]
        public int BrId { get; set; }

        public int RoundOffExpAccId { get; set; }

        public int RoundOffIncAccId { get; set; }
    }
}
