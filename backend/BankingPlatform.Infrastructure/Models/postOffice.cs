using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models
{
    public class PostOffice
    {
        public int id { get; set; }
        public int branchid { get; set; } = 1!;

        public string postofficename { get; set; } = null!;

        public string? postofficenamesl { get; set; }
        public string postofficecode { get; set; } = null!;
    }
}
