using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models
{
    public class ErrorLog
    {
        public int Id { get; set; }

        public int BranchId { get; set; }

        public int UserId { get; set; }

        public string ErrorMessage { get; set; } = string.Empty;

        public string StackTrace { get; set; } = string.Empty;

        public string? InnerException { get; set; }

        public DateTime ErrorDateTime { get; set; }

        public string FunctionName { get; set; } = string.Empty;

        public string ScreenName { get; set; } = string.Empty;
    }
}
