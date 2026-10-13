using BankingPlatform.API.DTO.Agent;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Agent;

namespace BankingPlatform.API.Service.Agent
{
    public class AgentLevelService
    {
        private readonly BankingDbContext _db;
        public AgentLevelService(BankingDbContext db) => _db = db;

        public async Task<(List<AgentLevelDTO> Items, int TotalCount)> GetAllAsync(int branchId, AgentFilterDTO filter)
        {
            var q = _db.agentlevel.AsNoTracking().Where(x => x.branchid == branchId);
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var t = filter.SearchTerm.ToLower();
                q = q.Where(x => x.code.ToLower().Contains(t) || x.description.ToLower().Contains(t));
            }
            var total = await q.CountAsync();
            var items = await q.OrderBy(x => x.description)
                               .Skip((filter.PageNumber - 1) * filter.PageSize)
                               .Take(filter.PageSize)
                               .ToListAsync();

            var parentIds = items.Where(x => x.parentlevelid.HasValue).Select(x => x.parentlevelid!.Value).Distinct().ToList();
            var parents = parentIds.Any()
                ? await _db.agentlevel.AsNoTracking().Where(x => parentIds.Contains(x.id)).ToDictionaryAsync(x => x.id, x => x.description)
                : new Dictionary<int, string>();

            return (items.Select(x => new AgentLevelDTO
            {
                Id = x.id, BranchId = x.branchid, Code = x.code, Description = x.description,
                ParentLevelId = x.parentlevelid,
                ParentLevelName = x.parentlevelid.HasValue && parents.TryGetValue(x.parentlevelid.Value, out var pn) ? pn : null
            }).ToList(), total);
        }

        public async Task<List<AgentLevelDTO>> GetDropdownAsync(int branchId)
        {
            return await _db.agentlevel.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .OrderBy(x => x.description)
                .Select(x => new AgentLevelDTO { Id = x.id, BranchId = x.branchid, Code = x.code, Description = x.description, ParentLevelId = x.parentlevelid })
                .ToListAsync();
        }

        public async Task<string> CreateAsync(AgentLevelDTO dto)
        {
            var exists = await _db.agentlevel.AnyAsync(x => x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (exists) return "Code already exists.";
            await _db.agentlevel.AddAsync(new AgentLevel
            {
                branchid = dto.BranchId, code = dto.Code.Trim(), description = dto.Description.Trim(), parentlevelid = dto.ParentLevelId
            });
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> UpdateAsync(AgentLevelDTO dto)
        {
            var entity = await _db.agentlevel.FirstOrDefaultAsync(x => x.id == dto.Id && x.branchid == dto.BranchId);
            if (entity == null) return "Not found.";
            var dup = await _db.agentlevel.AnyAsync(x => x.id != dto.Id && x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (dup) return "Code already exists.";
            entity.code = dto.Code.Trim();
            entity.description = dto.Description.Trim();
            entity.parentlevelid = dto.ParentLevelId;
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.agentlevel.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (entity == null) return "Not found.";
            var inUseAsParent = await _db.agentlevel.AnyAsync(x => x.branchid == branchId && x.parentlevelid == id);
            if (inUseAsParent) return "IN_USE_PARENT";
            var inUseByAgent = await _db.agentmaster.AnyAsync(x => x.branchid == branchId && x.agentlevelid == id);
            if (inUseByAgent) return "IN_USE";
            _db.agentlevel.Remove(entity);
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
