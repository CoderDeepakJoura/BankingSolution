using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class MonthlySalary
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public DateTime salarymonth { get; set; }
        public DateTime processdate { get; set; }
        public int sessionid { get; set; }
        public int processedby { get; set; }
    }

    public class MonthlySalaryEmpDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int monthlysalaryid { get; set; }
        public int empid { get; set; }
        public decimal totalgross { get; set; }
        public decimal totaldeduction { get; set; }
        public decimal netpay { get; set; }
    }

    public class MonthlySalaryCompDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int monthlysalaryempid { get; set; }
        public int compid { get; set; }
        public decimal amount { get; set; }
        public short isdeduction { get; set; } = 0;
    }
}
