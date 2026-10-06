using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;

namespace BankingPlatform.API.Service.Salary
{
    public class EmpGradeService
    {
        private readonly BankingDbContext _db;
        public EmpGradeService(BankingDbContext db) => _db = db;

        public async Task<(List<EmpGradeDTO> Items, int Total)> GetAllAsync(int branchId, string search, int page, int pageSize)
        {
            var q = _db.empgrade.AsNoTracking()
                .Where(x => x.branchid == branchId);

            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(x => x.code.Contains(search) || x.description.Contains(search));

            var total = await q.CountAsync();
            var items = await q.OrderBy(x => x.code)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(x => new EmpGradeDTO { Id = x.id, BranchId = x.branchid, Code = x.code, Description = x.description })
                .ToListAsync();

            return (items, total);
        }

        public async Task<List<EmpGradeDTO>> GetDropdownAsync(int branchId) =>
            await _db.empgrade.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .OrderBy(x => x.code)
                .Select(x => new EmpGradeDTO { Id = x.id, BranchId = x.branchid, Code = x.code, Description = x.description })
                .ToListAsync();

        public async Task<string> CreateAsync(EmpGradeDTO dto)
        {
            if (await _db.empgrade.AnyAsync(x => x.branchid == dto.BranchId && x.code == dto.Code))
                throw new InvalidOperationException($"Grade code '{dto.Code}' already exists.");

            _db.empgrade.Add(new EmpGrade { branchid = dto.BranchId, code = dto.Code.Trim(), description = dto.Description.Trim() });
            await _db.SaveChangesAsync();
            return "Employee grade created successfully.";
        }

        public async Task<string> UpdateAsync(EmpGradeDTO dto)
        {
            var entity = await _db.empgrade.FindAsync(dto.Id)
                ?? throw new KeyNotFoundException("Grade not found.");

            if (await _db.empgrade.AnyAsync(x => x.branchid == dto.BranchId && x.code == dto.Code && x.id != dto.Id))
                throw new InvalidOperationException($"Grade code '{dto.Code}' already exists.");

            entity.code = dto.Code.Trim();
            entity.description = dto.Description.Trim();
            await _db.SaveChangesAsync();
            return "Employee grade updated successfully.";
        }

        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.empgrade.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId)
                ?? throw new KeyNotFoundException("Grade not found.");

            if (await _db.employeedesignation.AnyAsync(x => x.empgradeid == id && x.branchid == branchId))
                throw new InvalidOperationException("Grade is in use by one or more designations.");

            _db.empgrade.Remove(entity);
            await _db.SaveChangesAsync();
            return "Employee grade deleted successfully.";
        }
    }
}
