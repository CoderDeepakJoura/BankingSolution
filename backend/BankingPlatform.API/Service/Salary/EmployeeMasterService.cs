using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;

namespace BankingPlatform.API.Service.Salary
{
    public class EmployeeMasterService
    {
        private readonly BankingDbContext _db;
        public EmployeeMasterService(BankingDbContext db) => _db = db;

        public async Task<(List<EmployeeMasterDTO> Items, int TotalCount)> GetAllAsync(int branchId, SalaryFilterDTO filter)
        {
            var q = _db.employeemaster.AsNoTracking()
                .Where(x => x.branchid == branchId);
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var t = filter.SearchTerm.ToLower();
                q = q.Where(x => x.firstname.ToLower().Contains(t) || (x.lastname != null && x.lastname.ToLower().Contains(t)) || x.code.ToLower().Contains(t));
            }
            var total = await q.CountAsync();
            var items = await q.OrderBy(x => x.firstname)
                               .Skip((filter.PageNumber - 1) * filter.PageSize)
                               .Take(filter.PageSize)
                               .ToListAsync();

            var designations = await _db.employeedesignation.AsNoTracking()
                .Where(x => x.branchid == branchId).ToListAsync();

            var result = items.Select(x => new EmployeeMasterDTO
            {
                Id = x.id, BranchId = x.branchid, Code = x.code,
                FirstName = x.firstname, LastName = x.lastname,
                DesignationId = x.designationid,
                DesignationName = designations.FirstOrDefault(d => d.id == x.designationid)?.description,
                EmpType = x.emptype, GenderId = x.genderid,
                Dob = x.dob == DateTime.MinValue ? null : x.dob.ToString("yyyy-MM-dd"),
                Phone = x.phone, Address = x.address,
                JoiningDate = x.joiningdate.ToString("yyyy-MM-dd"),
                Status = x.status, EmailId = x.emailid, Remarks = x.remarks
            }).ToList();
            return (result, total);
        }

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

        public async Task<string> CreateAsync(EmployeeMasterDTO dto)
        {
            var exists = await _db.employeemaster.AnyAsync(x => x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (exists) return "Employee Code already exists.";

            DateTime dob = DateTime.MinValue;
            if (!string.IsNullOrEmpty(dto.Dob)) DateTime.TryParse(dto.Dob, out dob);
            DateTime joining = DateTime.Now;
            if (!string.IsNullOrEmpty(dto.JoiningDate)) DateTime.TryParse(dto.JoiningDate, out joining);

            await _db.employeemaster.AddAsync(new EmployeeMaster
            {
                branchid = dto.BranchId, code = dto.Code.Trim(),
                firstname = dto.FirstName.Trim(), lastname = dto.LastName?.Trim(),
                designationid = dto.DesignationId, emptype = dto.EmpType,
                genderid = dto.GenderId, dob = dob, phone = dto.Phone?.Trim(),
                address = dto.Address?.Trim(), joiningdate = joining,
                status = dto.Status, emailid = dto.EmailId?.Trim(), remarks = dto.Remarks?.Trim(),
                currentbranchid = dto.BranchId
            });
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> UpdateAsync(EmployeeMasterDTO dto)
        {
            var entity = await _db.employeemaster.FirstOrDefaultAsync(x => x.id == dto.Id && x.branchid == dto.BranchId);
            if (entity == null) return "Not found.";

            var dup = await _db.employeemaster.AnyAsync(x => x.id != dto.Id && x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (dup) return "Employee Code already exists.";

            DateTime dob = DateTime.MinValue;
            if (!string.IsNullOrEmpty(dto.Dob)) DateTime.TryParse(dto.Dob, out dob);
            DateTime joining = DateTime.Now;
            if (!string.IsNullOrEmpty(dto.JoiningDate)) DateTime.TryParse(dto.JoiningDate, out joining);

            entity.code = dto.Code.Trim(); entity.firstname = dto.FirstName.Trim();
            entity.lastname = dto.LastName?.Trim(); entity.designationid = dto.DesignationId;
            entity.emptype = dto.EmpType; entity.genderid = dto.GenderId; entity.dob = dob;
            entity.phone = dto.Phone?.Trim(); entity.address = dto.Address?.Trim();
            entity.joiningdate = joining; entity.status = dto.Status;
            entity.emailid = dto.EmailId?.Trim(); entity.remarks = dto.Remarks?.Trim();
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.employeemaster.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (entity == null) return "Not found.";
            _db.employeemaster.Remove(entity);
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
