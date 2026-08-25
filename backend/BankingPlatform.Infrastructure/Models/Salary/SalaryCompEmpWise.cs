using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class SalaryCompEmpWise
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public DateTime date { get; set; }
        public int empid { get; set; }
        public int compid { get; set; }
        public decimal amount { get; set; }
        public short isactive { get; set; } = 1;
    }
}
