using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models
{
    public class Thana
    {
        public int id { get; set; }
        public int branchid { get; set; } = 1!;

        public string thananame { get; set; } = null!;

        public string? thananamesl { get; set; }
        public string thanacode { get; set; } = null!;
    }
}
