using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Models.AccMasters
{
    public class AccountMaster
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ID { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int HeadId { get; set; }

        [Required]
        public long HeadCode { get; set; }

        [Required]
        public int AccTypeId { get; set; }

        public int? GeneralProductId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AccountNumber { get; set; } = ""!;

        [MaxLength(20)]
        public string? AccPrefix { get; set; }

        [Range(0, 9999, ErrorMessage = "Account suffix cannot exceed 4 digits.")]
        public int? AccSuffix { get; set; }

        [MaxLength(100)]
        public string? AccountName { get; set; }

        [MaxLength(100)]
        public string? AccountNameSL { get; set; }

        public int? MemberId { get; set; }
        public int? MemberBranchID { get; set; }

        [Column(TypeName = "date")]
        public DateTime AccOpeningDate { get; set; }

        public bool IsAccClosed { get; set; }

        [Column(TypeName = "date")]
        public DateTime? ClosingDate { get; set; }

        [MaxLength(255)]
        public string? ClosingRemarks { get; set; }

        public short? IsAccAddedManually { get; set; }
        public short? IsJointAccount { get; set; }
        public short? IsSuspenseAccount { get; set; }
        public string? RelativeName { get; set; }
        public int? Gender { get; set; }
        public string? PhoneNo1 { get; set; }
        public string? Email { get; set; }
        public string? AddressLine { get; set; }

        public DateTime? DOB { get; set; }

        public string? addedusing { get; set; }
    }

    [Table("accountnomineeinfo")]
    public class AccountNomineeInfo
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("branchid")]
        public int BranchId { get; set; }

        [Required]
        [Column("accountid")]
        public int AccountId { get; set; }

        [Required]
        [Column("nomineename")]
        [MaxLength(255)]
        public string NomineeName { get; set; }

        [Required]
        [Column("nomineedob")]
        public DateTime NomineeDob { get; set; }

        [Required]
        [Column("relationwithaccholder")]
        public int RelationWithAccHolder { get; set; }

        [Required]
        [Column("addressline")]
        [MaxLength(500)]
        public string AddressLine { get; set; }

        [Required]
        [Column("nomineedate")]
        public DateTime NomineeDate { get; set; }

        [Required]
        [Column("isminor")]
        public short IsMinor { get; set; }

        [Column("nameofguardian")]
        [MaxLength(255)]
        public string? NameOfGuardian { get; set; }

    }

    [Table("accountdocdetails")]
    public class AccountDocDetails
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("branchid")]
        public int BranchId { get; set; }

        [Required]
        [Column("accountid")]
        public int AccountId { get; set; }

        [Required]
        [Column("picext")]
        [MaxLength(10)]
        public string PicExt { get; set; }

        [Required]
        [Column("signext")]
        [MaxLength(10)]
        public string SignExt { get; set; }

    }
    [Table("jointaccountinfo")]
    public class JointAccountInfo
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("branchid")]
        public int BranchId { get; set; }

        [Required]
        [Column("accountname")]
        [MaxLength(255)]
        public string AccountName { get; set; }

        [Required]
        [Column("relationwithaccholder")]
        public int RelationWithAccHolder { get; set; }

        [Required]
        [Column("dob")]
        public DateTime Dob { get; set; }

        [Required]
        [Column("addressline")]
        [MaxLength(500)]
        public string AddressLine { get; set; }

        [Required]
        [Column("gender")]
        public int Gender { get; set; }

        [Required]
        [Column("memberid")]
        public int MemberId { get; set; }

        [Required]
        [Column("memberbrid")]
        public int MemberBrId { get; set; }

        [Required]
        [Column("jointwithaccountid")]
        public int JointWithAccountId { get; set; }
        [Required]
        [Column("jointaccholderaccountnumber")]
        public string jointaccholderaccountnumber { get; set; } = ""!;
    }

    [Table("jointaccountwithdrawalinfo")]
    public class JointAccountWithdrawalInfo
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("branchid")]
        public int BranchId { get; set; }

        [Required]
        [Column("accountid")]
        public int AccountId { get; set; }

        [Required]
        [Column("minimumpersonsrequiredforwithdrawal")]
        public int MinimumPersonsRequiredForWithdrawal { get; set; }

        [Required]
        [Column("jointaccountholdercompulsoryforwithdrawal")]
        public short JointAccountHolderCompulsoryForWithdrawal { get; set; }

    }
}
