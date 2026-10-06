using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.Salary
{
    public class EmployeeDesignationDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        [Required, MaxLength(20)]
        public string Alias { get; set; } = "";
        [Required, MaxLength(150)]
        public string Description { get; set; } = "";
        public int EmpGradeId { get; set; } = 0;
    }

    public class EmployeeMasterDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        // Step 1 — employee identity
        [Required, MaxLength(50)]
        public string Code { get; set; } = "";
        [Required, MaxLength(80)]
        public string FirstName { get; set; } = "";
        public string? LastName { get; set; }
        public string? RelativeName { get; set; }
        public string? Relation { get; set; }
        public string? Station { get; set; }
        public int GenderId { get; set; } = 1;
        public int MaritalStatus { get; set; } = 1;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? HoAcNo { get; set; }

        // Step 1 — employee detail
        public int DesignationId { get; set; }
        public string? DesignationName { get; set; }
        public int EmpType { get; set; } = 1;
        public string JoiningDate { get; set; } = "";
        public string? Dob { get; set; }
        public string? EmailId { get; set; }
        public bool IsLeave { get; set; } = false;
        public string? LeaveDate { get; set; }
        public int Status { get; set; } = 1;
        public string? Remarks { get; set; }

        // Step 2 — payroll
        public string? PfAccountNo { get; set; }
        public string? UanNo { get; set; }
        public string? EsicAccountNo { get; set; }
        public string? LastIncrementDate { get; set; }
        public int SavingAccountId { get; set; } = 0;
        public string? SavingAccountName { get; set; }
        public List<string> EducationQual { get; set; } = new();
        public List<EmployeeLeaveAllotmentDTO> LeaveAllotments { get; set; } = new();
    }

    public class EmployeeLeaveAllotmentDTO
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public int BranchId { get; set; }
        public string LeaveType { get; set; } = "";
        public int NoOfDays { get; set; }
        public string AllotmentDate { get; set; } = "";
    }

    public class SalaryComponentDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        [Required, MaxLength(50)]
        public string Alias { get; set; } = "";
        [Required, MaxLength(200)]
        public string Description { get; set; } = "";
        public int SeqNo { get; set; }
        public int Type { get; set; } = 1;
        public short IsEditable { get; set; } = 1;
        public short DefineAmount { get; set; } = 0;
        public short IsAllowance { get; set; } = 1;
        public short IsDeduction { get; set; } = 0;
        public int? AccId { get; set; }
        public string? AccName { get; set; }
    }

    public class SalaryCompEmpWiseDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string Date { get; set; } = "";
        public int EmpId { get; set; }
        public int CompId { get; set; }
        public string? CompName { get; set; }
        public decimal Amount { get; set; }
        public short IsActive { get; set; } = 1;
        public short IsDeduction { get; set; } = 0;
    }

    public class SalaryCreationRequestDTO
    {
        public int BranchId { get; set; }
        public int EmpId { get; set; }
        public string SalaryDate { get; set; } = "";
        public string DateFrom { get; set; } = "";
        public string DateTo { get; set; } = "";
    }

    public class SalaryCreationResponseDTO
    {
        public int EmpId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string DesignationName { get; set; } = "";
        public int EmpType { get; set; }
        public List<SalaryComponentLineDTO> Components { get; set; } = new();
        public int DaysInMonth { get; set; }
    }

    public class SalaryComponentLineDTO
    {
        public int ComponentId { get; set; }
        public string Name { get; set; } = "";
        public short IsActive { get; set; } = 1;
        public decimal Amount { get; set; }
        public int? AccId { get; set; }
        public int ComponentType { get; set; }
        public short IsDeduction { get; set; } = 0;
    }

    public class SaveMonthlySalaryDTO
    {
        public int BranchId { get; set; }
        public int SessionId { get; set; }
        public int ProcessedBy { get; set; }
        public string SalaryMonth { get; set; } = "";
        public List<SaveEmpSalaryDTO> Employees { get; set; } = new();
    }

    public class SaveEmpSalaryDTO
    {
        public int EmpId { get; set; }
        public decimal TotalGross { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal NetPay { get; set; }
        public List<SaveCompDetailDTO> Components { get; set; } = new();
    }

    public class SaveCompDetailDTO
    {
        public int CompId { get; set; }
        public decimal Amount { get; set; }
        public short IsDeduction { get; set; } = 0;
    }

    public class SalaryFilterDTO
    {
        public string SearchTerm { get; set; } = "";
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class AttendanceRowDTO
    {
        public int Id { get; set; }
        public int EmpId { get; set; }
        public string EmpCode { get; set; } = "";
        public string EmpName { get; set; } = "";
        public string DesignationName { get; set; } = "";
        public decimal El { get; set; } = 0;
        public decimal Cl { get; set; } = 0;
        public decimal Mlsl { get; set; } = 0;
        public decimal Lwp { get; set; } = 0;
        public string Remarks { get; set; } = "";
    }

    public class SaveAttendanceRowDTO
    {
        public int EmpId { get; set; }
        public decimal El { get; set; } = 0;
        public decimal Cl { get; set; } = 0;
        public decimal Mlsl { get; set; } = 0;
        public decimal Lwp { get; set; } = 0;
        public string Remarks { get; set; } = "";
    }

    public class SaveAttendanceDTO
    {
        public int BranchId { get; set; }
        public string AttMonth { get; set; } = ""; // "YYYY-MM-01"
        public int AttType { get; set; } = 2;
        public List<SaveAttendanceRowDTO> Rows { get; set; } = new();
    }

    // ── Bonus Report ──────────────────────────────────────────────────────────
    public class BonusReportRequestDTO
    {
        public int BranchId { get; set; }
        [Required]
        public string FromDate { get; set; } = "";
        [Required]
        public string ToDate { get; set; } = "";
        [Range(1, 365)]
        public int Days { get; set; } = 30;
    }

    public class BonusReportRowDTO
    {
        public int SrNo { get; set; }
        public int EmpId { get; set; }
        public string EmpName { get; set; } = "";
        public string Designation { get; set; } = "";
        public decimal LeaveCount { get; set; }
        public decimal BonusDays { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal Bonus { get; set; }
    }

    public class BonusReportResponseDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string FromDate { get; set; } = "";
        public string ToDate { get; set; } = "";
        public int Days { get; set; }
        public decimal TotalBonus { get; set; }
        public List<BonusReportRowDTO> Rows { get; set; } = new();
    }

    // ── EmpGrade ─────────────────────────────────────────────────────────────
    public class EmpGradeDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        [Required, MaxLength(20)]
        public string Code { get; set; } = "";
        [Required, MaxLength(150)]
        public string Description { get; set; } = "";
    }

    // ── PayrollSettings ───────────────────────────────────────────────────────
    public class PayrollSettingsDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int SalaryAccId { get; set; }
        public string SalaryAccName { get; set; } = "";
        public int StartDayOfMonth { get; set; } = 1;
        public int DaysInMonth { get; set; } = 0;
        public string CpfHeadCode { get; set; } = "";
        public string RdHeadCode { get; set; } = "";
        public decimal MaxSalaryForPf { get; set; } = 15000;
        public bool ExtraEmployeePf { get; set; } = false;
        public bool ExtraEmployerPf { get; set; } = false;
        public decimal MaxFpf { get; set; } = 0;
        public decimal EmployeresicPerc { get; set; } = 3.25m;
        public decimal EsicLimit { get; set; } = 21000;
        public List<int> LoanProductIds { get; set; } = new();
    }

    // ── Salary Voucher dropdown ───────────────────────────────────────────────
    public class SalaryVoucherDropdownDTO
    {
        public int Id { get; set; }
        public string Label { get; set; } = "";
        public string SalaryMonth { get; set; } = "";
    }

    // ── PF Statement ──────────────────────────────────────────────────────────
    public class PFStatementRequestDTO
    {
        public int BranchId { get; set; }
        public int SalaryVoucherId { get; set; }
    }

    public class PFStatementRowDTO
    {
        public int SrNo { get; set; }
        public string PfAccount { get; set; } = "";
        public string UanNo { get; set; } = "";
        public string EmpName { get; set; } = "";
        public decimal Salary { get; set; }
        public decimal Share { get; set; }
        public decimal Epf { get; set; }
        public decimal Fpf { get; set; }
    }

    public class PFStatementResponseDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string SalaryMonth { get; set; } = "";
        public List<PFStatementRowDTO> Rows { get; set; } = new();
        public decimal TotalSalary { get; set; }
        public decimal TotalShare { get; set; }
        public decimal TotalEpf { get; set; }
        public decimal TotalFpf { get; set; }
    }

    // ── ESIC Statement ────────────────────────────────────────────────────────
    public class ESICStatementRequestDTO
    {
        public int BranchId { get; set; }
        public int SalaryVoucherId { get; set; }
    }

    public class ESICStatementRowDTO
    {
        public int SrNo { get; set; }
        public string EsicAccount { get; set; } = "";
        public string EmpName { get; set; } = "";
        public decimal Salary { get; set; }
        public decimal EmployeeShare { get; set; }
        public decimal EmployerShare { get; set; }
        public decimal TotalEsic { get; set; }
    }

    public class ESICStatementResponseDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string SalaryMonth { get; set; } = "";
        public decimal EsicLimit { get; set; }
        public List<ESICStatementRowDTO> Rows { get; set; } = new();
        public decimal TotalSalary { get; set; }
        public decimal TotalEmployeeShare { get; set; }
        public decimal TotalEmployerShare { get; set; }
        public decimal TotalEsic { get; set; }
    }

    // ── Salary Register ───────────────────────────────────────────────────────
    public class SalaryRegisterRequestDTO
    {
        public int BranchId { get; set; }
        public int SalaryVoucherId { get; set; }
    }

    public class SalaryRegisterRowDTO
    {
        public int SrNo { get; set; }
        public int EmpId { get; set; }
        public string EmpName { get; set; } = "";
        public string Designation { get; set; } = "";
        public decimal Days { get; set; }
        public decimal El { get; set; }
        public decimal Cl { get; set; }
        public decimal Sl { get; set; }
        public decimal Lwp { get; set; }
        public decimal TotalGross { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal NetPay { get; set; }
        public List<ComponentAmountDTO> Earnings { get; set; } = new();
        public List<ComponentAmountDTO> Deductions { get; set; } = new();
    }

    public class ComponentAmountDTO
    {
        public int CompId { get; set; }
        public string CompName { get; set; } = "";
        public string CompAlias { get; set; } = "";
        public decimal Amount { get; set; }
    }

    public class SalaryRegisterResponseDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string SalaryMonth { get; set; } = "";
        public List<ComponentAmountDTO> EarningComponents { get; set; } = new();
        public List<ComponentAmountDTO> DeductionComponents { get; set; } = new();
        public List<SalaryRegisterRowDTO> Rows { get; set; } = new();
        public decimal TotalGross { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal TotalNetPay { get; set; }
        // PF footer
        public decimal EpfPerc { get; set; } = 3.67m;
        public decimal FpfPerc { get; set; } = 8.33m;
        public decimal AdmnPerc { get; set; } = 1.10m;
        public decimal EdliPerc { get; set; } = 0.50m;
        public decimal Ac22Perc { get; set; } = 0.01m;
        public decimal EpfAmount { get; set; }
        public decimal FpfAmount { get; set; }
        public decimal AdmnAmount { get; set; }
        public decimal EdliAmount { get; set; }
        public decimal Ac22Amount { get; set; }
        public decimal SanctionedTotal { get; set; }
    }

    // ── Employee Salary Statement ─────────────────────────────────────────────
    public class EmpSalaryStatementRequestDTO
    {
        public int BranchId { get; set; }
        public int EmpId { get; set; }
    }

    public class EmpSalaryStatementRowDTO
    {
        public string SalaryMonth { get; set; } = "";
        public decimal TotalGross { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal NetPay { get; set; }
        public List<ComponentAmountDTO> Components { get; set; } = new();
    }

    public class EmpSalaryStatementResponseDTO
    {
        public string EmpName { get; set; } = "";
        public string EmpCode { get; set; } = "";
        public string Designation { get; set; } = "";
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public List<ComponentAmountDTO> AllComponents { get; set; } = new();
        public List<EmpSalaryStatementRowDTO> Rows { get; set; } = new();
    }

    // ── Arrear Report ─────────────────────────────────────────────────────────
    public class ArrearReportRequestDTO
    {
        public int BranchId { get; set; }
        public string FromMonth { get; set; } = "";
        public string ToMonth { get; set; } = "";
        public int? EmpId { get; set; }
        public List<int> CompIds { get; set; } = new();
    }

    public class ArrearRowDTO
    {
        public int SrNo { get; set; }
        public string EmpName { get; set; } = "";
        public string SalaryMonth { get; set; } = "";
        public string CompName { get; set; } = "";
        public decimal Due { get; set; }
        public decimal Drawn { get; set; }
        public decimal Arrear { get; set; }
    }

    public class ArrearReportResponseDTO
    {
        public string BranchName { get; set; } = "";
        public string FromMonth { get; set; } = "";
        public string ToMonth { get; set; } = "";
        public List<ArrearRowDTO> Rows { get; set; } = new();
        public decimal TotalDue { get; set; }
        public decimal TotalDrawn { get; set; }
        public decimal TotalArrear { get; set; }
    }

    // ── Salary Challan ────────────────────────────────────────────────────────
    public class SalaryChallanRequestDTO
    {
        public int BranchId { get; set; }
        public int SalaryVoucherId { get; set; }
    }

    public class SalaryChallanRowDTO
    {
        public int SrNo { get; set; }
        public string EmpName { get; set; } = "";
        public string Designation { get; set; } = "";
        public string AccountNo { get; set; } = "";
        public decimal TotalGross { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal NetPay { get; set; }
        public List<ComponentAmountDTO> Earnings { get; set; } = new();
        public List<ComponentAmountDTO> Deductions { get; set; } = new();
    }

    public class SalaryChallanResponseDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string SalaryMonth { get; set; } = "";
        public List<ComponentAmountDTO> EarningComponents { get; set; } = new();
        public List<ComponentAmountDTO> DeductionComponents { get; set; } = new();
        public List<SalaryChallanRowDTO> Rows { get; set; } = new();
        public decimal TotalGross { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal TotalNetPay { get; set; }
    }

    // ── Delete Salary ─────────────────────────────────────────────────────────
    public class DeleteSalaryRequestDTO
    {
        public int BranchId { get; set; }
        public int SalaryVoucherId { get; set; }
    }

    // ── Loan Recovery Detail Report ───────────────────────────────────────────
    public class LoanRecoveryDetailRequestDTO
    {
        public int BranchId { get; set; }
        public int SalaryVoucherId { get; set; }
    }

    public class ComponentAmountHeader
    {
        public int CompId { get; set; }
        public string CompAlias { get; set; } = "";
    }

    public class LoanRecoveryDetailRowDTO
    {
        public int SrNo { get; set; }
        public string EmpName { get; set; } = "";
        public string Designation { get; set; } = "";
        public List<ComponentAmountDTO> Deductions { get; set; } = new();
        public decimal TotalDeduction { get; set; }
    }

    public class LoanRecoveryDetailResponseDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string SalaryMonth { get; set; } = "";
        public List<ComponentAmountHeader> DeductionComponents { get; set; } = new();
        public List<LoanRecoveryDetailRowDTO> Rows { get; set; } = new();
        public decimal TotalDeduction { get; set; }
    }

    // ── Salary Voucher List ───────────────────────────────────────────────────
    public class SalaryVoucherListRowDTO
    {
        public int SrNo { get; set; }
        public int VoucherId { get; set; }
        public string SalaryMonth { get; set; } = "";
        public string ProcessDate { get; set; } = "";
        public int EmployeeCount { get; set; }
        public decimal TotalGross { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal TotalNetPay { get; set; }
    }

    public class SalaryVoucherListResponseDTO
    {
        public string BranchName { get; set; } = "";
        public List<SalaryVoucherListRowDTO> Rows { get; set; } = new();
    }

    // ── Employee Transfer ──────────────────────────────────────────────────────
    public class EmployeeTransferDTO
    {
        public int EmpId { get; set; }
        public int FromBranchId { get; set; }
        public int ToBranchId { get; set; }
        public string TransferDate { get; set; } = "";
        public string Remarks { get; set; } = "";
    }
}
