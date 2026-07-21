using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    [Table("otherbranchaccounts")]
    public class OtherBranchAccount
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("otherbrid")]
        public int OtherBrId { get; set; }

        [Column("accid")]
        public int AccId { get; set; }
    }
}
