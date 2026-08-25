using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Salary
{
    public class SalaryComponent
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        public int branchid { get; set; }
        public string alias { get; set; } = "";
        public string description { get; set; } = "";
        public int seqno { get; set; }
        public int type { get; set; }
        public short iseditable { get; set; } = 1;
        public string formulaecode { get; set; } = "F";
        public short defineamount { get; set; } = 0;
        public short isallowance { get; set; } = 0;
        public short isdeduction { get; set; } = 0;
        public int? accid { get; set; }
    }
}
