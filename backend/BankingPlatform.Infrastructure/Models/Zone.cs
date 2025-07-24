using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models
{
    public class Zone
    {
        public int id { get; set; }
        public int branchid { get; set; } = 1!;

        public string zonename { get; set; } = null!;

        public string? zonenamesl { get; set; }
        public string zonecode { get; set; } = null!;
    }
}
