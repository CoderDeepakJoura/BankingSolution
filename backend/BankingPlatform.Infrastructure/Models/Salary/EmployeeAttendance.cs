using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class EmployeeAttendance
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int empid { get; set; }
        public DateTime attmonth { get; set; }
        public int atttype { get; set; } = 2; // 1=Daily, 2=Monthly
        public decimal el { get; set; } = 0;
        public decimal cl { get; set; } = 0;
        public decimal mlsl { get; set; } = 0;
        public decimal lwp { get; set; } = 0;
        public string? remarks { get; set; }
    }
}
