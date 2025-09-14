using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Common
{
    public class CommonInfraClass
    {
        public string branchName { get; set; } = ""!;
        public string branchCode { get; set; } = ""!;
        public string userName { get; set; } = ""!;
        public string userRole { get; set; } = ""!;
        public int branchId { get; set; } = 1!;
        public string societyName { get; set; } = ""!;
    }
}
