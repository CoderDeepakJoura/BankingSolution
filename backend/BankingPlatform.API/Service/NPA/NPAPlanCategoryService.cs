using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.NPA;
using BankingPlatform.Infrastructure.Models.NPA;

namespace BankingPlatform.API.Service.NPA
{
    public class NPAPlanCategoryService
    {
        private readonly BankingDbContext _context;

        public NPAPlanCategoryService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<string> CreateAsync(NPAPlanCategoryDTO dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.npaplancategory.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower()))
                return "NPA Plan Category with this name already exists.";

            _context.npaplancategory.Add(MapToEntity(dto));
            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<string> UpdateAsync(NPAPlanCategoryDTO dto)
        {
            var entity = await _context.npaplancategory.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("NPA Plan Category not found.");

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.npaplancategory.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower() && x.Id != dto.Id))
                return "NPA Plan Category with this name already exists.";

            entity.ParentId = dto.ParentId;
            entity.IsGroup = dto.IsGroup;
            entity.PlanId = dto.PlanId;
            entity.PeriodFrom = dto.PeriodFrom;
            entity.PeriodTo = dto.PeriodTo;
            entity.ProvisioningPerc = dto.ProvisioningPerc;
            entity.IntMaxPeriod = dto.IntMaxPeriod;
            entity.Description = dto.Description;
            entity.DescriptionSL = dto.DescriptionSL;
            entity.SeqNo = dto.SeqNo;
            entity.AllPrinOverdue = dto.AllPrinOverdue;

            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.npaplancategory.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;

            _context.npaplancategory.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<NPAPlanCategoryDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.npaplancategory.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return null;

            var dto = MapToDTO(entity);
            if (entity.PlanId.HasValue)
                dto.PlanCode = await _context.npaplanmaster.AsNoTracking()
                    .Where(p => p.Id == entity.PlanId && p.BrId == branchId)
                    .Select(p => p.Code).FirstOrDefaultAsync();
            if (entity.ParentId.HasValue)
                dto.ParentDescription = await _context.npaplancategory.AsNoTracking()
                    .Where(c => c.Id == entity.ParentId && c.BrId == branchId)
                    .Select(c => c.Description).FirstOrDefaultAsync();

            return dto;
        }

        public async Task<(List<NPAPlanCategoryDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.npaplancategory.AsNoTracking().Where(x => x.BrId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x => (x.Description != null && x.Description.ToLower().Contains(term)));
            }

            var total = await query.CountAsync();
            var items = await query.OrderBy(x => x.SeqNo).ThenBy(x => x.Description)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var planIds = items.Where(i => i.PlanId.HasValue).Select(i => i.PlanId!.Value).Distinct().ToList();
            var parentIds = items.Where(i => i.ParentId.HasValue).Select(i => i.ParentId!.Value).Distinct().ToList();

            var plans = await _context.npaplanmaster.AsNoTracking()
                .Where(p => planIds.Contains(p.Id) && p.BrId == branchId)
                .ToDictionaryAsync(p => p.Id, p => p.Code);

            var parents = await _context.npaplancategory.AsNoTracking()
                .Where(c => parentIds.Contains(c.Id) && c.BrId == branchId)
                .ToDictionaryAsync(c => c.Id, c => c.Description ?? "");

            var dtos = items.Select(e =>
            {
                var dto = MapToDTO(e);
                if (e.PlanId.HasValue && plans.TryGetValue(e.PlanId.Value, out var code)) dto.PlanCode = code;
                if (e.ParentId.HasValue && parents.TryGetValue(e.ParentId.Value, out var desc)) dto.ParentDescription = desc;
                return dto;
            }).ToList();

            return (dtos, total);
        }

        public async Task<List<NPAPlanCategoryDTO>> GetGroupsAsync(int branchId)
        {
            return await _context.npaplancategory.AsNoTracking()
                .Where(x => x.BrId == branchId && x.IsGroup == "Y")
                .OrderBy(x => x.Description)
                .Select(x => new NPAPlanCategoryDTO { Id = x.Id, BranchId = x.BrId, Description = x.Description })
                .ToListAsync();
        }

        private static NPAPlanCategory MapToEntity(NPAPlanCategoryDTO dto) => new()
        {
            Id = dto.Id,
            BrId = dto.BranchId,
            ParentId = dto.ParentId,
            IsGroup = dto.IsGroup,
            PlanId = dto.PlanId,
            PeriodFrom = dto.PeriodFrom,
            PeriodTo = dto.PeriodTo,
            ProvisioningPerc = dto.ProvisioningPerc,
            IntMaxPeriod = dto.IntMaxPeriod,
            Description = dto.Description,
            DescriptionSL = dto.DescriptionSL,
            SeqNo = dto.SeqNo,
            AllPrinOverdue = dto.AllPrinOverdue,
        };

        private static NPAPlanCategoryDTO MapToDTO(NPAPlanCategory e) => new()
        {
            Id = e.Id,
            BranchId = e.BrId,
            ParentId = e.ParentId,
            IsGroup = e.IsGroup,
            PlanId = e.PlanId,
            PeriodFrom = e.PeriodFrom,
            PeriodTo = e.PeriodTo,
            ProvisioningPerc = e.ProvisioningPerc,
            IntMaxPeriod = e.IntMaxPeriod,
            Description = e.Description,
            DescriptionSL = e.DescriptionSL,
            SeqNo = e.SeqNo,
            AllPrinOverdue = e.AllPrinOverdue,
        };
    }
}
