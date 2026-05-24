using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.GST
{
    [Table("billbook")]
    public class BillBook
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("description")]
        [StringLength(100)]
        public string? Description { get; set; }

        [Column("billnoprefix")]
        [StringLength(5)]
        public string? BillNoPrefix { get; set; }

        [Column("billnofrom")]
        public int BillNoFrom { get; set; }

        // 1=Financial Year, 2=Continuous
        [Column("billnogeneration")]
        public short BillNoGeneration { get; set; } = 1;
    }
}
