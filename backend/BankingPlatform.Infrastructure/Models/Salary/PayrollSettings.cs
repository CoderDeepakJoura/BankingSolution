using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class PayrollSettings
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int salaryaccid { get; set; }
        public int startdayofmonth { get; set; } = 1;
        public int daysinmonth { get; set; } = 0;
        public string cpfheadcode { get; set; } = "";
        public string rdheadcode { get; set; } = "";
        public decimal maxsalaryforpf { get; set; } = 15000;
        public bool extraemployeepf { get; set; } = false;
        public bool extraemployerpf { get; set; } = false;
        public decimal maxfpf { get; set; } = 0;
        public decimal employeresicperc { get; set; } = 3.25m;
        public decimal esiclimit { get; set; } = 21000;
    }

    public class PayrollSettingsLoanComp
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public int payrollsettingsid { get; set; }
        public int loanproductid { get; set; }
    }
}
