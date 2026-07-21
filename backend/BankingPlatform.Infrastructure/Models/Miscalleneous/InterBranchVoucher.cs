using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingPlatform.Infrastructure.Models.Miscalleneous
{
    [Table("interbranchvoucher")]
    public class InterBranchVoucher
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        // Core transaction
        [Column("vouchertype")]   [MaxLength(20)]  public string VoucherType { get; set; } = "";
        [Column("flowtype")]      [MaxLength(20)]  public string FlowType    { get; set; } = "BranchToBranch"; // "HOToBranch" | "BranchToBranch"
        [Column("amount", TypeName = "numeric(18,2)")] public decimal Amount { get; set; }
        [Column("narration")]     [MaxLength(300)] public string? Narration { get; set; }
        [Column("entrydate")]                      public DateTime EntryDate { get; set; }
        [Column("status")]        [MaxLength(20)]  public string Status { get; set; } = "Pending";

        // Branches
        [Column("frombrid")]  public int FromBrId  { get; set; }
        [Column("destbrid")]  public int DestBrId  { get; set; }

        // Destination account (denormalised for permanent audit)
        [Column("destaccid")]                        public int DestAccId     { get; set; }
        [Column("destaccno")]   [MaxLength(50)]      public string DestAccNo  { get; set; } = "";
        [Column("destaccname")] [MaxLength(200)]     public string? DestAccName { get; set; }
        [Column("destmemberid")]                     public int? DestMemberId { get; set; }

        // Step 1 — originating branch
        [Column("step1voucherid")]                   public int?    Step1VoucherId  { get; set; }
        [Column("step1brid")]                        public int?    Step1BrId       { get; set; }
        [Column("step1draccid")]                     public int?    Step1DrAccId    { get; set; }
        [Column("step1draccname")] [MaxLength(200)]  public string? Step1DrAccName  { get; set; }
        [Column("step1drheadcode")]                  public long?   Step1DrHeadCode { get; set; }
        [Column("step1craccid")]                     public int?    Step1CrAccId    { get; set; }
        [Column("step1craccname")] [MaxLength(200)]  public string? Step1CrAccName  { get; set; }
        [Column("step1crheadcode")]                  public long?   Step1CrHeadCode { get; set; }
        [Column("step1date")]                        public DateTime? Step1Date       { get; set; }
        [Column("step1workingdate")]                 public DateTime? Step1WorkingDate { get; set; }
        [Column("step1userid")] [MaxLength(100)]     public string? Step1UserId     { get; set; }

        // Step 2 — HO settlement
        [Column("step2voucherid")]                   public int?    Step2VoucherId  { get; set; }
        [Column("step2brid")]                        public int?    Step2BrId       { get; set; }
        [Column("step2draccid")]                     public int?    Step2DrAccId    { get; set; }
        [Column("step2draccname")] [MaxLength(200)]  public string? Step2DrAccName  { get; set; }
        [Column("step2drheadcode")]                  public long?   Step2DrHeadCode { get; set; }
        [Column("step2craccid")]                     public int?    Step2CrAccId    { get; set; }
        [Column("step2craccname")] [MaxLength(200)]  public string? Step2CrAccName  { get; set; }
        [Column("step2crheadcode")]                  public long?   Step2CrHeadCode { get; set; }
        [Column("step2date")]                        public DateTime? Step2Date       { get; set; }
        [Column("step2workingdate")]                 public DateTime? Step2WorkingDate { get; set; }
        [Column("step2userid")] [MaxLength(100)]     public string? Step2UserId     { get; set; }

        // Step 3 — destination branch completion
        [Column("step3voucherid")]                   public int?    Step3VoucherId  { get; set; }
        [Column("step3brid")]                        public int?    Step3BrId       { get; set; }
        [Column("step3draccid")]                     public int?    Step3DrAccId    { get; set; }
        [Column("step3draccname")] [MaxLength(200)]  public string? Step3DrAccName  { get; set; }
        [Column("step3drheadcode")]                  public long?   Step3DrHeadCode { get; set; }
        [Column("step3craccid")]                     public int?    Step3CrAccId    { get; set; }
        [Column("step3craccname")] [MaxLength(200)]  public string? Step3CrAccName  { get; set; }
        [Column("step3crheadcode")]                  public long?   Step3CrHeadCode { get; set; }
        [Column("step3date")]                        public DateTime? Step3Date       { get; set; }
        [Column("step3workingdate")]                 public DateTime? Step3WorkingDate { get; set; }
        [Column("step3userid")] [MaxLength(100)]     public string? Step3UserId     { get; set; }
    }
}
