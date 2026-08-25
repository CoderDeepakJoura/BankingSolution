using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class EmployeeDesignation
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public string alias { get; set; } = "";
        public string description { get; set; } = "";
        public int empgradeid { get; set; } = 0;
    }
}
