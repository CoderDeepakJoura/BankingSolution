using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models
{
    public class branchMaster
    {
        [Key]
        public int id { get; set; }

        [Required(ErrorMessage = "Society ID is required.")]
        public int branchmaster_societyid { get; set; }

        [StringLength(20, ErrorMessage = "Branch code cannot exceed 20 characters.")]
        public string branchmaster_code { get; set; } = ""!;

        [Required(ErrorMessage = "Branch name is required.")]
        [StringLength(200, ErrorMessage = "Branch name cannot exceed 200 characters.")]
        public string branchmaster_name { get; set; } = ""!;

        [StringLength(250, ErrorMessage = "Branch name (in SL) cannot exceed 250 characters.")]
        public string? branchmaster_namesl { get; set; }

        [StringLength(200, ErrorMessage = "Address cannot exceed 200 characters.")]
        public string branchmaster_addressline { get; set; } = ""!;

        [StringLength(250, ErrorMessage = "Address (in SL) cannot exceed 250 characters.")]
        public string? branchmaster_addresslinesl { get; set; }

        public int? branchmaster_addresstype { get; set; }

        public int branchmaster_stationid { get; set; }

        [StringLength(5, ErrorMessage = "phone prefix cannot exceed 5 characters.")]
        public string branchmaster_phoneprefix1 { get; set; } = ""!;

        [StringLength(20, ErrorMessage = "phone number cannot exceed 20 characters.")]
        public string branchmaster_phoneno1 { get; set; } = ""!;

        public int branchmaster_phonetype1 { get; set; }

        [StringLength(5, ErrorMessage = "phone prefix cannot exceed 5 characters.")]
        public string? branchmaster_phoneprefix2 { get; set; }

        [StringLength(20, ErrorMessage = "phone number cannot exceed 20 characters.")]
        public string? branchmaster_phoneno2 { get; set; }

        public int? branchmaster_phonetype2 { get; set; }

        public short branchmaster_ismainbranch { get; set; }

        public int? branchmaster_seqno { get; set; }

        [StringLength(50, ErrorMessage = "Email ID cannot exceed 50 characters.")]
        [EmailAddress(ErrorMessage = "Invalid email address format.")]
        public string branchmaster_emailid { get; set; } = ""!;

        [StringLength(50, ErrorMessage = "Pincode cannot exceed 50 characters.")]
        public string branchmaster_pincode { get; set; } = ""!;

        public int branchmaster_tehsilid { get; set; }

        [StringLength(25, ErrorMessage = "GSTINo cannot exceed 25 characters.")]
        public string branchmaster_gstino { get; set; } = ""!;

        public DateTime branchmaster_gstnoissuedate { get; set; }

        public int branchmaster_stateid { get; set; }
    }
}
