using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.GST
{
    public class TaxType
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("brid")]
        public int BrId { get; set; }

        [Column("description")]
        [StringLength(50)]
        public string? Description { get; set; }

        [Column("descriptionsl")]
        [StringLength(100)]
        public string? DescriptionSL { get; set; }

        [Column("code")]
        [StringLength(10)]
        public string? Code { get; set; }

        // 1=WithinState, 2=OutOfState, 3=Both
        [Column("appliedin")]
        public int? AppliedIn { get; set; }

        // 0=No, 1=Yes, 2=Both
        [Column("isut")]
        public short? IsUT { get; set; }

        // 1=Ratio, 2=Item
        [Column("calculatedfrom")]
        public int CalculatedFrom { get; set; } = 1;

        [Column("seqno")]
        public int SeqNo { get; set; } = 1;

        [Column("inaccid")]
        public int InAccId { get; set; }

        [Column("outaccid")]
        public int OutAccId { get; set; }
    }
}
