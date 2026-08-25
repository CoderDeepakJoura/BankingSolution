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
        [Required, MaxLength(50)]
        public string Code { get; set; } = "";
        [Required, MaxLength(80)]
        public string FirstName { get; set; } = "";
        public string? LastName { get; set; }
        public int DesignationId { get; set; }
        public string? DesignationName { get; set; }
        public int EmpType { get; set; } = 1;
        public int GenderId { get; set; } = 1;
        public string? Dob { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string JoiningDate { get; set; } = "";
        public int Status { get; set; } = 1;
        public string? EmailId { get; set; }
        public string? Remarks { get; set; }
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
}
