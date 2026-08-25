using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;

namespace BankingPlatform.API.Service.Salary
{
    public class SalaryComponentService
    {
        private readonly BankingDbContext _db;
        public SalaryComponentService(BankingDbContext db) => _db = db;

        public async Task<(List<SalaryComponentDTO> Items, int TotalCount)> GetAllAsync(int branchId, SalaryFilterDTO filter)
        {
            var q = _db.salarycomponent.AsNoTracking().Where(x => x.branchid == branchId);
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var t = filter.SearchTerm.ToLower();
                q = q.Where(x => x.alias.ToLower().Contains(t) || x.description.ToLower().Contains(t));
            }
            var total = await q.CountAsync();
            var items = await q.OrderBy(x => x.seqno)
                               .Skip((filter.PageNumber - 1) * filter.PageSize)
                               .Take(filter.PageSize)
                               .Select(x => new SalaryComponentDTO
                               {
                                   Id = x.id, BranchId = x.branchid, Alias = x.alias,
                                   Description = x.description, SeqNo = x.seqno, Type = x.type,
                                   IsEditable = x.iseditable, DefineAmount = x.defineamount,
                                   IsAllowance = x.isallowance, IsDeduction = x.isdeduction, AccId = x.accid
                               }).ToListAsync();
            return (items, total);
        }

        public async Task<List<SalaryComponentDTO>> GetAllForDropdownAsync(int branchId)
        {
            return await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .OrderBy(x => x.seqno)
                .Select(x => new SalaryComponentDTO
                {
                    Id = x.id, BranchId = x.branchid, Alias = x.alias, Description = x.description,
                    SeqNo = x.seqno, Type = x.type, IsAllowance = x.isallowance, IsDeduction = x.isdeduction,
                    DefineAmount = x.defineamount, AccId = x.accid
                }).ToListAsync();
        }

        public async Task<string> CreateAsync(SalaryComponentDTO dto)
        {
            var exists = await _db.salarycomponent.AnyAsync(x => x.branchid == dto.BranchId && x.alias.ToLower() == dto.Alias.ToLower());
            if (exists) return "Component Alias already exists.";
            await _db.salarycomponent.AddAsync(new SalaryComponent
            {
                branchid = dto.BranchId, alias = dto.Alias.Trim(), description = dto.Description.Trim(),
                seqno = dto.SeqNo, type = dto.Type, iseditable = dto.IsEditable,
                defineamount = dto.DefineAmount, isallowance = dto.IsAllowance, isdeduction = dto.IsDeduction,
                accid = dto.AccId
            });
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> UpdateAsync(SalaryComponentDTO dto)
        {
            var entity = await _db.salarycomponent.FirstOrDefaultAsync(x => x.id == dto.Id && x.branchid == dto.BranchId);
            if (entity == null) return "Not found.";
            var dup = await _db.salarycomponent.AnyAsync(x => x.id != dto.Id && x.branchid == dto.BranchId && x.alias.ToLower() == dto.Alias.ToLower());
            if (dup) return "Component Alias already exists.";
            entity.alias = dto.Alias.Trim(); entity.description = dto.Description.Trim();
            entity.seqno = dto.SeqNo; entity.type = dto.Type; entity.iseditable = dto.IsEditable;
            entity.defineamount = dto.DefineAmount; entity.isallowance = dto.IsAllowance;
            entity.isdeduction = dto.IsDeduction; entity.accid = dto.AccId;
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.salarycomponent.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (entity == null) return "Not found.";
            _db.salarycomponent.Remove(entity);
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> SaveEmpWiseAmountsAsync(int branchId, int empId, string date, List<SalaryCompEmpWiseDTO> components)
        {
            if (!DateTime.TryParse(date, out var dt)) return "Invalid date.";
            var existing = await _db.salarycompempwise
                .Where(x => x.branchid == branchId && x.empid == empId && x.date.Date == dt.Date)
                .ToListAsync();
            _db.salarycompempwise.RemoveRange(existing);
            foreach (var c in components)
            {
                await _db.salarycompempwise.AddAsync(new SalaryCompEmpWise
                {
                    branchid = branchId, empid = empId, compid = c.CompId,
                    date = dt, amount = c.Amount, isactive = c.IsActive
                });
            }
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
