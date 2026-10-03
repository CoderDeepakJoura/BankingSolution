using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class EmployeeLeaveAllotment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int employeeid { get; set; }
        public int branchid { get; set; }
        public string leavetype { get; set; } = "";
        public int noofdays { get; set; }
        public DateTime allotmentdate { get; set; }
    }
}
