using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.Location
{
    public class Village
    {
        public int id { get; set; }
        public int branchid { get; set; } = 1!;

        public string villagename { get; set; } = null!;

        public string? villagenamesl { get; set; }
        public int zoneid { get; set; }
        public int thanaid { get; set; }
        public int postofficeid { get; set; }
        public int tehsilid { get; set; }
        public int pincode { get; set; }
        public int patwarId { get; set; }
    }
}
