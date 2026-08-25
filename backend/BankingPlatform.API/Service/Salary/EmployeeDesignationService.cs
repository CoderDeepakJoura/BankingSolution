using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;

namespace BankingPlatform.API.Service.Salary
{
    public class EmployeeDesignationService
    {
        private readonly BankingDbContext _db;
        public EmployeeDesignationService(BankingDbContext db) => _db = db;

        public async Task<(List<EmployeeDesignationDTO> Items, int TotalCount)> GetAllAsync(int branchId, SalaryFilterDTO filter)
        {
            var q = _db.employeedesignation.AsNoTracking().Where(x => x.branchid == branchId);
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var t = filter.SearchTerm.ToLower();
                q = q.Where(x => x.description.ToLower().Contains(t) || x.alias.ToLower().Contains(t));
            }
            var total = await q.CountAsync();
            var items = await q.OrderBy(x => x.description)
                               .Skip((filter.PageNumber - 1) * filter.PageSize)
                               .Take(filter.PageSize)
                               .Select(x => new EmployeeDesignationDTO
                               {
                                   Id = x.id, BranchId = x.branchid, Alias = x.alias,
                                   Description = x.description, EmpGradeId = x.empgradeid
                               }).ToListAsync();
            return (items, total);
        }

        public async Task<List<EmployeeDesignationDTO>> GetAllForDropdownAsync(int branchId)
        {
            return await _db.employeedesignation.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .OrderBy(x => x.description)
                .Select(x => new EmployeeDesignationDTO { Id = x.id, BranchId = x.branchid, Alias = x.alias, Description = x.description, EmpGradeId = x.empgradeid })
                .ToListAsync();
        }

        public async Task<string> CreateAsync(EmployeeDesignationDTO dto)
        {
            var exists = await _db.employeedesignation.AnyAsync(x => x.branchid == dto.BranchId && x.alias.ToLower() == dto.Alias.ToLower());
            if (exists) return "Alias already exists.";
            await _db.employeedesignation.AddAsync(new EmployeeDesignation
            {
                branchid = dto.BranchId, alias = dto.Alias.Trim(), description = dto.Description.Trim(), empgradeid = dto.EmpGradeId
            });
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> UpdateAsync(EmployeeDesignationDTO dto)
        {
            var entity = await _db.employeedesignation.FirstOrDefaultAsync(x => x.id == dto.Id && x.branchid == dto.BranchId);
            if (entity == null) return "Not found.";
            var dup = await _db.employeedesignation.AnyAsync(x => x.id != dto.Id && x.branchid == dto.BranchId && x.alias.ToLower() == dto.Alias.ToLower());
            if (dup) return "Alias already exists.";
            entity.alias = dto.Alias.Trim();
            entity.description = dto.Description.Trim();
            entity.empgradeid = dto.EmpGradeId;
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.employeedesignation.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (entity == null) return "Not found.";
            var inUse = await _db.employeemaster.AnyAsync(x => x.branchid == branchId && x.designationid == id);
            if (inUse) return "IN_USE";
            _db.employeedesignation.Remove(entity);
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
