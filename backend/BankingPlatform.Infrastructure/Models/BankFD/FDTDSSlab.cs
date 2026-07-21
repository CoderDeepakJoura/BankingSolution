using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.BankFD
{
    public class FDTDSSlab
    {
        [Key, Required, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID { get; set; }
        [Required]
        public int BrId { get; set; }
        public string Name { get; set; } = "";
        public string? NameSL { get; set; }
        public DateTime Date { get; set; }
        public int Type { get; set; } = 8;
        public short WithPanCard { get; set; } = 0;
    }
}
