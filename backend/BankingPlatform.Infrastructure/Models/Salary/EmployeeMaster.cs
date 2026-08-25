using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class EmployeeMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public string code { get; set; } = "";
        public string firstname { get; set; } = "";
        public string? lastname { get; set; }
        public int designationid { get; set; }
        public int emptype { get; set; } = 1;
        public int genderid { get; set; }
        public DateTime dob { get; set; }
        public string? phone { get; set; }
        public string? address { get; set; }
        public DateTime joiningdate { get; set; }
        public int status { get; set; } = 1;
        public int memberid { get; set; } = 0;
        public int memberbranchid { get; set; } = 0;
        public string? remarks { get; set; }
        public string? emailid { get; set; }
        public int currentbranchid { get; set; } = 0;
    }
}
