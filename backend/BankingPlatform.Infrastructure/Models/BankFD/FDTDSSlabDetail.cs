using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.BankFD
{
    public class FDTDSSlabDetail
    {
        [Key, Required, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID { get; set; }
        [Required]
        public int BrId { get; set; }
        public int SlabID { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal FromAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal ToAmount { get; set; }
        public double IntRate { get; set; }
    }
}
