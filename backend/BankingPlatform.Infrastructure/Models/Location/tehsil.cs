using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Location
{
    public class Tehsil
    {
        public int id { get; set; }
        public int branchid { get; set; } = 1!;

        public string tehsilname { get; set; } = null!;

        public string? tehsilnamesl { get; set; }
        public string tehsilcode { get; set; } = null!;
    }
}
