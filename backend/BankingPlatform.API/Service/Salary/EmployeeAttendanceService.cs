using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;

namespace BankingPlatform.API.Service.Salary
{
    public class EmployeeAttendanceService
    {
        private readonly BankingDbContext _db;
        public EmployeeAttendanceService(BankingDbContext db) => _db = db;

        /// <summary>
        /// Returns all active employees for the branch with their attendance records for the given month.
        /// Employees with no record yet are included with zero values so the UI can fill them in.
        /// </summary>
        public async Task<List<AttendanceRowDTO>> GetAttendanceAsync(int branchId, string month)
        {
            if (!DateTime.TryParse(month + "-01", out var attMonth))
                return new List<AttendanceRowDTO>();

            var employees = await _db.employeemaster.AsNoTracking()
                .Where(e => e.branchid == branchId && e.status == 1)
                .OrderBy(e => e.code)
                .ToListAsync();

            var designations = await _db.employeedesignation.AsNoTracking()
                .Where(d => d.branchid == branchId)
                .ToDictionaryAsync(d => d.id, d => d.description);

            var existing = await _db.employeeattendance.AsNoTracking()
                .Where(a => a.branchid == branchId && a.attmonth == attMonth)
                .ToDictionaryAsync(a => a.empid);

            var result = new List<AttendanceRowDTO>();
            foreach (var emp in employees)
            {
                existing.TryGetValue(emp.id, out var rec);
                designations.TryGetValue(emp.designationid, out var desigName);

                result.Add(new AttendanceRowDTO
                {
                    Id = rec?.id ?? 0,
                    EmpId = emp.id,
                    EmpCode = emp.code,
                    EmpName = (emp.firstname + " " + (emp.lastname ?? "")).Trim(),
                    DesignationName = desigName ?? "",
                    El   = rec?.el   ?? 0,
                    Cl   = rec?.cl   ?? 0,
                    Mlsl = rec?.mlsl ?? 0,
                    Lwp  = rec?.lwp  ?? 0,
                    Remarks = rec?.remarks ?? "",
                });
            }
            return result;
        }

        /// <summary>
        /// Upserts attendance records for all rows in the DTO.
        /// Existing records are updated; new ones are inserted.
        /// </summary>
        public async Task<string> SaveAttendanceAsync(SaveAttendanceDTO dto)
        {
            if (!DateTime.TryParse(dto.AttMonth, out var attMonth))
                return "Invalid month format.";
            if (dto.Rows == null || dto.Rows.Count == 0)
                return "No rows to save.";

            var empIds = dto.Rows.Select(r => r.EmpId).ToList();

            var existing = await _db.employeeattendance
                .Where(a => a.branchid == dto.BranchId && a.attmonth == attMonth && empIds.Contains(a.empid))
                .ToDictionaryAsync(a => a.empid);

            foreach (var row in dto.Rows)
            {
                if (existing.TryGetValue(row.EmpId, out var rec))
                {
                    rec.el      = row.El;
                    rec.cl      = row.Cl;
                    rec.mlsl    = row.Mlsl;
                    rec.lwp     = row.Lwp;
                    rec.remarks = row.Remarks;
                    rec.atttype = dto.AttType;
                }
                else
                {
                    _db.employeeattendance.Add(new EmployeeAttendance
                    {
                        branchid = dto.BranchId,
                        empid    = row.EmpId,
                        attmonth = attMonth,
                        atttype  = dto.AttType,
                        el       = row.El,
                        cl       = row.Cl,
                        mlsl     = row.Mlsl,
                        lwp      = row.Lwp,
                        remarks  = row.Remarks,
                    });
                }
            }

            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
