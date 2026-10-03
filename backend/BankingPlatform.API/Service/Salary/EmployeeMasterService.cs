using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;
using System.Text.Json;

namespace BankingPlatform.API.Service.Salary
{
    public class EmployeeMasterService
    {
        private readonly BankingDbContext _db;
        public EmployeeMasterService(BankingDbContext db) => _db = db;

        // ── Helpers ──────────────────────────────────────────────────────────────
        private static DateTime ParseDate(string? s) =>
            DateTime.TryParse(s, out var d) ? d : DateTime.MinValue;

        private static DateTime? ParseDateNullable(string? s) =>
            string.IsNullOrEmpty(s) ? null : DateTime.TryParse(s, out var d) ? d : null;

        private EmployeeMasterDTO MapToDTO(EmployeeMaster x, string? desigName, List<EmployeeLeaveAllotment> leaves)
        {
            List<string> edu = new();
            if (!string.IsNullOrEmpty(x.educationqual))
            {
                try { edu = JsonSerializer.Deserialize<List<string>>(x.educationqual) ?? new(); } catch { }
            }

            return new EmployeeMasterDTO
            {
                Id = x.id, BranchId = x.branchid, Code = x.code,
                FirstName = x.firstname, LastName = x.lastname,
                RelativeName = x.relativename, Relation = x.relation,
                Station = x.station, GenderId = x.genderid,
                MaritalStatus = x.maritalstatus, Phone = x.phone,
                Address = x.address, HoAcNo = x.hoacno,
                DesignationId = x.designationid, DesignationName = desigName,
                EmpType = x.emptype,
                JoiningDate = x.joiningdate == DateTime.MinValue ? "" : x.joiningdate.ToString("yyyy-MM-dd"),
                Dob = x.dob == DateTime.MinValue ? null : x.dob.ToString("yyyy-MM-dd"),
                EmailId = x.emailid, IsLeave = x.isleave,
                LeaveDate = x.leavedate.HasValue ? x.leavedate.Value.ToString("yyyy-MM-dd") : null,
                Status = x.status, Remarks = x.remarks,
                PfAccountNo = x.pfaccountno, UanNo = x.uanno,
                EsicAccountNo = x.esicaccountno,
                LastIncrementDate = x.lastincrementdate.HasValue ? x.lastincrementdate.Value.ToString("yyyy-MM-dd") : null,
                SavingAccountId = x.savingaccountid,
                EducationQual = edu,
                LeaveAllotments = leaves.Select(l => new EmployeeLeaveAllotmentDTO
                {
                    Id = l.id, EmployeeId = l.employeeid, BranchId = l.branchid,
                    LeaveType = l.leavetype, NoOfDays = l.noofdays,
                    AllotmentDate = l.allotmentdate.ToString("yyyy-MM-dd")
                }).ToList()
            };
        }

        // ── List ─────────────────────────────────────────────────────────────────
        public async Task<(List<EmployeeMasterDTO> Items, int TotalCount)> GetAllAsync(int branchId, SalaryFilterDTO filter)
        {
            var q = _db.employeemaster.AsNoTracking().Where(x => x.branchid == branchId);
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var t = filter.SearchTerm.ToLower();
                q = q.Where(x => x.firstname.ToLower().Contains(t)
                               || (x.lastname != null && x.lastname.ToLower().Contains(t))
                               || x.code.ToLower().Contains(t));
            }
            var total = await q.CountAsync();
            var items = await q.OrderBy(x => x.firstname)
                               .Skip((filter.PageNumber - 1) * filter.PageSize)
                               .Take(filter.PageSize)
                               .ToListAsync();

            var desigMap = (await _db.employeedesignation.AsNoTracking()
                .Where(x => x.branchid == branchId).ToListAsync())
                .ToDictionary(d => d.id, d => d.description);

            var result = items.Select(x => MapToDTO(x,
                desigMap.TryGetValue(x.designationid, out var dn) ? dn : null,
                new List<EmployeeLeaveAllotment>())).ToList();

            return (result, total);
        }

        // ── Get Single (for edit) ─────────────────────────────────────────────
        public async Task<EmployeeMasterDTO?> GetByIdAsync(int id, int branchId)
        {
            var x = await _db.employeemaster.AsNoTracking()
                .FirstOrDefaultAsync(e => e.id == id && e.branchid == branchId);
            if (x == null) return null;

            var desig = await _db.employeedesignation.AsNoTracking()
                .FirstOrDefaultAsync(d => d.id == x.designationid && d.branchid == branchId);

            var leaves = await _db.employeeleaveallotment.AsNoTracking()
                .Where(l => l.employeeid == id && l.branchid == branchId).ToListAsync();

            return MapToDTO(x, desig?.description, leaves);
        }

        // ── Dropdown ─────────────────────────────────────────────────────────────
        public async Task<List<EmployeeMasterDTO>> GetAllForDropdownAsync(int branchId)
        {
            return await _db.employeemaster.AsNoTracking()
                .Where(x => x.branchid == branchId && x.status == 1)
                .OrderBy(x => x.firstname)
                .Select(x => new EmployeeMasterDTO
                {
                    Id = x.id, BranchId = x.branchid, Code = x.code,
                    FirstName = x.firstname, LastName = x.lastname,
                    DesignationId = x.designationid, EmpType = x.emptype
                }).ToListAsync();
        }

        // ── Create (Step 1) ──────────────────────────────────────────────────────
        public async Task<(string Result, int EmpId)> CreateAsync(EmployeeMasterDTO dto)
        {
            var exists = await _db.employeemaster.AnyAsync(
                x => x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (exists) return ("Employee Code already exists.", 0);

            var entity = new EmployeeMaster
            {
                branchid = dto.BranchId, code = dto.Code.Trim(),
                firstname = dto.FirstName.Trim(), lastname = dto.LastName?.Trim(),
                relativename = dto.RelativeName?.Trim(), relation = dto.Relation?.Trim(),
                station = dto.Station?.Trim(), genderid = dto.GenderId,
                maritalstatus = dto.MaritalStatus, phone = dto.Phone?.Trim(),
                address = dto.Address?.Trim(), hoacno = dto.HoAcNo?.Trim(),
                designationid = dto.DesignationId, emptype = dto.EmpType,
                joiningdate = ParseDate(dto.JoiningDate),
                dob = ParseDate(dto.Dob),
                emailid = dto.EmailId?.Trim(), isleave = dto.IsLeave,
                leavedate = ParseDateNullable(dto.LeaveDate),
                status = dto.Status, remarks = dto.Remarks?.Trim(),
                currentbranchid = dto.BranchId
            };
            await _db.employeemaster.AddAsync(entity);
            await _db.SaveChangesAsync();
            return ("Success", entity.id);
        }

        // ── Save Payroll (Step 2) ────────────────────────────────────────────────
        public async Task<string> SavePayrollAsync(EmployeeMasterDTO dto)
        {
            var entity = await _db.employeemaster
                .FirstOrDefaultAsync(x => x.id == dto.Id && x.branchid == dto.BranchId);
            if (entity == null) return "Employee not found.";

            entity.pfaccountno = dto.PfAccountNo?.Trim();
            entity.uanno = dto.UanNo?.Trim();
            entity.esicaccountno = dto.EsicAccountNo?.Trim();
            entity.lastincrementdate = ParseDateNullable(dto.LastIncrementDate);
            entity.savingaccountid = dto.SavingAccountId;
            entity.educationqual = dto.EducationQual.Count > 0
                ? JsonSerializer.Serialize(dto.EducationQual) : null;

            // Replace leave allotments
            var existing = _db.employeeleaveallotment
                .Where(l => l.employeeid == dto.Id && l.branchid == dto.BranchId);
            _db.employeeleaveallotment.RemoveRange(existing);

            foreach (var l in dto.LeaveAllotments.Where(l => !string.IsNullOrEmpty(l.LeaveType) && l.NoOfDays > 0))
            {
                await _db.employeeleaveallotment.AddAsync(new EmployeeLeaveAllotment
                {
                    employeeid = dto.Id, branchid = dto.BranchId,
                    leavetype = l.LeaveType.Trim(), noofdays = l.NoOfDays,
                    allotmentdate = ParseDateNullable(l.AllotmentDate) ?? DateTime.Today
                });
            }

            await _db.SaveChangesAsync();
            return "Success";
        }

        // ── Update (Step 1 fields) ───────────────────────────────────────────────
        public async Task<string> UpdateAsync(EmployeeMasterDTO dto)
        {
            var entity = await _db.employeemaster
                .FirstOrDefaultAsync(x => x.id == dto.Id && x.branchid == dto.BranchId);
            if (entity == null) return "Not found.";

            var dup = await _db.employeemaster.AnyAsync(
                x => x.id != dto.Id && x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (dup) return "Employee Code already exists.";

            entity.code = dto.Code.Trim(); entity.firstname = dto.FirstName.Trim();
            entity.lastname = dto.LastName?.Trim();
            entity.relativename = dto.RelativeName?.Trim();
            entity.relation = dto.Relation?.Trim();
            entity.station = dto.Station?.Trim();
            entity.genderid = dto.GenderId; entity.maritalstatus = dto.MaritalStatus;
            entity.phone = dto.Phone?.Trim(); entity.address = dto.Address?.Trim();
            entity.hoacno = dto.HoAcNo?.Trim();
            entity.designationid = dto.DesignationId; entity.emptype = dto.EmpType;
            entity.joiningdate = ParseDate(dto.JoiningDate);
            entity.dob = ParseDate(dto.Dob);
            entity.emailid = dto.EmailId?.Trim();
            entity.isleave = dto.IsLeave;
            entity.leavedate = ParseDateNullable(dto.LeaveDate);
            entity.status = dto.Status; entity.remarks = dto.Remarks?.Trim();

            // Also persist payroll fields if provided
            if (!string.IsNullOrEmpty(dto.PfAccountNo) || !string.IsNullOrEmpty(dto.UanNo))
            {
                entity.pfaccountno = dto.PfAccountNo?.Trim();
                entity.uanno = dto.UanNo?.Trim();
                entity.esicaccountno = dto.EsicAccountNo?.Trim();
                entity.lastincrementdate = ParseDateNullable(dto.LastIncrementDate);
                entity.savingaccountid = dto.SavingAccountId;
                entity.educationqual = dto.EducationQual.Count > 0
                    ? JsonSerializer.Serialize(dto.EducationQual) : null;

                var existing = _db.employeeleaveallotment
                    .Where(l => l.employeeid == dto.Id && l.branchid == dto.BranchId);
                _db.employeeleaveallotment.RemoveRange(existing);

                foreach (var l in dto.LeaveAllotments.Where(l => !string.IsNullOrEmpty(l.LeaveType) && l.NoOfDays > 0))
                {
                    await _db.employeeleaveallotment.AddAsync(new EmployeeLeaveAllotment
                    {
                        employeeid = dto.Id, branchid = dto.BranchId,
                        leavetype = l.LeaveType.Trim(), noofdays = l.NoOfDays,
                        allotmentdate = ParseDateNullable(l.AllotmentDate) ?? DateTime.Today
                    });
                }
            }

            await _db.SaveChangesAsync();
            return "Success";
        }

        // ── Delete ───────────────────────────────────────────────────────────────
        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.employeemaster
                .FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (entity == null) return "Not found.";

            var leaves = _db.employeeleaveallotment
                .Where(l => l.employeeid == id && l.branchid == branchId);
            _db.employeeleaveallotment.RemoveRange(leaves);

            _db.employeemaster.Remove(entity);
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
