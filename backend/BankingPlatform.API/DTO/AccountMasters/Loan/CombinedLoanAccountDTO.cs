using System.ComponentModel.DataAnnotations;
using BankingPlatform.API.DTO.AccountMasters;

namespace BankingPlatform.API.DTO.AccountMasters.Loan
{
    public class CombinedLoanAccountDTO
    {
        public AccountMasterDTO AccountMasterDTO { get; set; } = new();
        public AccountKistDetailDTO? KistDetail { get; set; }
        public List<AccountKistScheduleDTO> KistSchedule { get; set; } = new();
        public List<AccountLimitDetailDTO> LimitDetails { get; set; } = new();
        public List<AccountNomineeInfoDTO> Nominees { get; set; } = new();
        public LoanAccountGuarantorDTO? Guarantor { get; set; }
        public LoanAccOpeningBalanceDTO? OpeningBalance { get; set; }
        public List<LoanAccountBalanceDetailDTO> OpeningBalanceDetails { get; set; } = new();
        public List<LoanAccFDPledgeDTO> FDPledges { get; set; } = new();
        public List<LoanAccRDPledgeDTO> RDPledges { get; set; } = new();
        public bool IsNomineeRequired { get; set; }
    }

    public class AccountKistDetailDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int AccountId { get; set; }
        public double? LoanAmountPassed { get; set; }
        public int? LoanPeriod { get; set; }
        public int? SlabId { get; set; }
        public double? StandardInterestRate { get; set; }
        public double? OverdueInterestRate { get; set; }
        public DateTime LoanDate { get; set; }
        public int? KistInterval { get; set; }
        public DateTime KistFirstDate { get; set; }
        public double? KistAmount { get; set; }
        public double? KistPrinPart { get; set; }
        public double? KistIntPart { get; set; }
        public string? LoanNo { get; set; }
        public string? KistWithInterest { get; set; }
        public string? Status { get; set; }
        public int? LoanPeriodIndays { get; set; }
        public int? KistIntervalIndays { get; set; }
        public double? KislIntAmt { get; set; }
        public double? MarginMoney { get; set; }
    }

    public class AccountKistScheduleDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int? LoanAccId { get; set; }
        public int? KistNumber { get; set; }
        public DateTime? Date { get; set; }
        public decimal? KistAmount { get; set; }
        public decimal? PrincipalAmt { get; set; }
        public decimal? InterestAmt { get; set; }
        public decimal? RunningPrincipal { get; set; }
    }

    public class AccountLimitDetailDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int AccountId { get; set; }
        [Required]
        public string LoanNo { get; set; } = string.Empty;
        public DateTime LoanDate { get; set; }
        public double LoanAmountPassed { get; set; }
        public int LoanLimitPeriodInMonths { get; set; }
        public int LoanLimitPeriodInDays { get; set; }
        public int SlabId { get; set; }
        public double StandardInterestRate { get; set; }
        public double OverdueInterestRate { get; set; }
    }

    public class LoanAccountGuarantorDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int? Guar1MemId { get; set; }
        public int Guar1MemBrId { get; set; }
        public int? Guar2MemId { get; set; }
        public int Guar2MemBrId { get; set; }
        public int? Witness1MemId { get; set; }
        public int? Wit1MemBrId { get; set; }
        public int? Witness2MemId { get; set; }
        public int Wit2MemBrId { get; set; }
    }

    public class LoanAccOpeningBalanceDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public int? AccId { get; set; }
        public decimal? TotalBalance { get; set; }
        public string? BalType { get; set; }
        public decimal? OverDueBal { get; set; }
        public string? OverBalType { get; set; }
        public decimal? OpenInt { get; set; }
        public string? OpenIntType { get; set; }
        public decimal? OpenOverInt { get; set; }
        public string? OpenOverIntType { get; set; }
        public long? HeadCode { get; set; }
        public DateTime? OverDueDate { get; set; }
    }

    public class LoanAccountBalanceDetailDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int LoanOpenBalId { get; set; }
        public int AccountId { get; set; }
        public decimal AmountDr { get; set; }
        public decimal AmountCr { get; set; }
        public decimal IntDr { get; set; }
        public decimal IntCr { get; set; }
        public DateTime Date { get; set; }
        public DateTime ValueDate { get; set; }
        public string? Status { get; set; }
        public string? EntryType { get; set; }
        public long? HeadCode { get; set; }
    }

    public class LoanAccFDPledgeDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int? LoanAccId { get; set; }
        public int? FDAccId { get; set; }
        public int? FDAccDetId { get; set; }
        public string? FDAccNumber { get; set; }
        public string? FDAccName { get; set; }
        public decimal? FDAmount { get; set; }
        public decimal? Interest { get; set; }
        public DateTime? Date { get; set; }
        public int? Status { get; set; }
    }

    public class LoanAccRDPledgeDTO
    {
        public int? Id { get; set; }
        public int BrId { get; set; }
        public int? LoanAccId { get; set; }
        public int? RDAccId { get; set; }
        public int? RDAccDetId { get; set; }
        public string? RDAccNumber { get; set; }
        public string? RDAccName { get; set; }
        public decimal? RDAmount { get; set; }
        public decimal? Interest { get; set; }
        public DateTime? Date { get; set; }
        public int? Status { get; set; }
    }

    public class LoanAccListItemDTO
    {
        public int AccId { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public string? RelativeName { get; set; }
        public DateTime AccOpeningDate { get; set; }
        public bool IsAccClosed { get; set; }
        public string? ProductName { get; set; }
        public double? LoanAmountPassed { get; set; }
        public double? KistAmount { get; set; }
        public int? LoanPeriod { get; set; }
        public double? StandardInterestRate { get; set; }
        public string? LoanType { get; set; }
    }

    public class CalculateScheduleRequestDTO
    {
        public decimal LoanAmount { get; set; }
        public decimal StdIntRate { get; set; }
        public int LoanPeriod { get; set; }
        public int KistInterval { get; set; }
        public DateTime FirstKistDate { get; set; }
        public int IntFormulae { get; set; }  // 1=Flat, 2=Reducing
        public int IntSchedule { get; set; }  // 1=With Interest, 2=Without Interest
    }

    public class ScheduleResponseDTO
    {
        public List<AccountKistScheduleDTO> Schedule { get; set; } = new();
        public decimal TotalInterest { get; set; }
        public decimal TotalPayable { get; set; }
        public decimal KistAmount { get; set; }
        public decimal KistIntPart { get; set; }
        public decimal KistPrinPart { get; set; }
    }

    public class UnpledgeUnlockFDDTO
    {
        public int BrId { get; set; }
        public int PledgeId { get; set; }
        public int Action { get; set; }
        public DateTime Date { get; set; }
    }

    public class UnpledgeUnlockRDDTO
    {
        public int BrId { get; set; }
        public int PledgeId { get; set; }
        public int Action { get; set; }
        public DateTime Date { get; set; }
    }

    public class LoanProductInfoDTO
    {
        public int TypeId { get; set; }
        public int? CategoryId { get; set; }
        public string SecurityIds { get; set; } = string.Empty;
        public int? IntSchedule { get; set; }
        public int? IntFormulae { get; set; }
        public int? ActOnIntPosting { get; set; }
        public string? LoanPeriodType { get; set; }
        public string IsShareMoneyReq { get; set; } = "N";
        public decimal MinLoanAmount { get; set; }
        public decimal MaxLoanAmount { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }
}
