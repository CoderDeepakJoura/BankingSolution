using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Miscalleneous;
using BankingPlatform.Infrastructure.Models.Miscalleneous;

namespace BankingPlatform.API.Service.Loan
{
    public class ExpenseCategoryService
    {
        private readonly BankingDbContext _context;

        public ExpenseCategoryService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<string> CreateAsync(ExpenseCategoryDTO dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                await _context.expensecategory.AnyAsync(x => x.BrId == dto.BranchId && x.Code != null && x.Code.ToLower() == dto.Code.ToLower()))
                return "Expense Category with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.expensecategory.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower()))
                return "Expense Category with this description already exists.";

            _context.expensecategory.Add(MapToEntity(dto));
            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<string> UpdateAsync(ExpenseCategoryDTO dto)
        {
            var entity = await _context.expensecategory.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("Expense Category not found.");

            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                await _context.expensecategory.AnyAsync(x => x.BrId == dto.BranchId && x.Code != null && x.Code.ToLower() == dto.Code.ToLower() && x.Id != dto.Id))
                return "Expense Category with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.expensecategory.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower() && x.Id != dto.Id))
                return "Expense Category with this description already exists.";

            entity.Code = dto.Code?.Trim();
            entity.Description = dto.Description?.Trim();
            entity.DescriptionSL = dto.DescriptionSL?.Trim();

            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.expensecategory.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;

            _context.expensecategory.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ExpenseCategoryDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.expensecategory.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            return entity == null ? null : MapToDTO(entity);
        }

        public async Task<(List<ExpenseCategoryDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.expensecategory.AsNoTracking().Where(x => x.BrId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x =>
                    (x.Description != null && x.Description.ToLower().Contains(term)) ||
                    (x.Code != null && x.Code.ToLower().Contains(term)));
            }

            var total = await query.CountAsync();
            var items = await query.OrderBy(x => x.Code).ThenBy(x => x.Description)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return (items.Select(MapToDTO).ToList(), total);
        }

        public async Task<List<ExpenseCategoryDTO>> GetListAsync(int branchId)
        {
            return await _context.expensecategory.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.Code)
                .Select(x => new ExpenseCategoryDTO { Id = x.Id, BranchId = x.BrId, Code = x.Code, Description = x.Description })
                .ToListAsync();
        }

        private static ExpenseCategory MapToEntity(ExpenseCategoryDTO dto) => new()
        {
            BrId = dto.BranchId,
            Code = dto.Code?.Trim(),
            Description = dto.Description?.Trim(),
            DescriptionSL = dto.DescriptionSL?.Trim(),
        };

        private static ExpenseCategoryDTO MapToDTO(ExpenseCategory e) => new()
        {
            Id = e.Id,
            BranchId = e.BrId,
            Code = e.Code,
            Description = e.Description,
            DescriptionSL = e.DescriptionSL,
        };
    }
}
