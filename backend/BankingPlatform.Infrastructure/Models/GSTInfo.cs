using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models
{
    public class GSTInfo
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID { get; set; }

        [Required]
        public int BranchId { get; set; }
        public int AccId { get; set; }
        public int StateId { get; set; }
        public string GSTInNo { get; set; } = ""!;
    }
}
