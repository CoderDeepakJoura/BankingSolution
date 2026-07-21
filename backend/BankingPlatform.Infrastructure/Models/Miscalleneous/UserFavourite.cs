using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    [Table("userfavourites")]
    public class UserFavourite
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("userid")]
        public int UserId { get; set; }

        [Column("path")]
        public string Path { get; set; } = "";

        [Column("label")]
        public string Label { get; set; } = "";

        [Column("category")]
        public string Category { get; set; } = "";

        [Column("sortorder")]
        public int SortOrder { get; set; } = 0;

        [Column("createdat")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
