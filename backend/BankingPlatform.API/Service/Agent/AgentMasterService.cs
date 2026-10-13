using BankingPlatform.API.DTO.Agent;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Agent;

namespace BankingPlatform.API.Service.Agent
{
    public class AgentMasterService
    {
        private readonly BankingDbContext _db;
        public AgentMasterService(BankingDbContext db) => _db = db;

        public async Task<(List<AgentMasterDTO> Items, int TotalCount)> GetAllAsync(int branchId, AgentFilterDTO filter)
        {
            var q = _db.agentmaster.AsNoTracking().Where(x => x.branchid == branchId);
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var t = filter.SearchTerm.ToLower();
                q = q.Where(x => x.code.ToLower().Contains(t) || x.name.ToLower().Contains(t));
            }
            var total = await q.CountAsync();
            var items = await q.OrderBy(x => x.name)
                               .Skip((filter.PageNumber - 1) * filter.PageSize)
                               .Take(filter.PageSize)
                               .ToListAsync();

            var levelIds = items.Where(x => x.agentlevelid.HasValue).Select(x => x.agentlevelid!.Value).Distinct().ToList();
            var levels = levelIds.Any()
                ? await _db.agentlevel.AsNoTracking().Where(x => levelIds.Contains(x.id)).ToDictionaryAsync(x => x.id, x => x.description)
                : new Dictionary<int, string>();

            return (items.Select(x => new AgentMasterDTO
            {
                Id = x.id, BranchId = x.branchid, Code = x.code, Name = x.name,
                AgentLevelId = x.agentlevelid,
                AgentLevelName = x.agentlevelid.HasValue && levels.TryGetValue(x.agentlevelid.Value, out var ln) ? ln : null,
                Phone = x.phone, Address = x.address, IsActive = x.isactive
            }).ToList(), total);
        }

        public async Task<List<AgentMasterDTO>> GetDropdownAsync(int branchId, bool activeOnly = true)
        {
            var q = _db.agentmaster.AsNoTracking().Where(x => x.branchid == branchId);
            if (activeOnly) q = q.Where(x => x.isactive);
            return await q.OrderBy(x => x.name)
                .Select(x => new AgentMasterDTO { Id = x.id, BranchId = x.branchid, Code = x.code, Name = x.name, AgentLevelId = x.agentlevelid, Phone = x.phone, Address = x.address, IsActive = x.isactive })
                .ToListAsync();
        }

        public async Task<string> CreateAsync(AgentMasterDTO dto)
        {
            var exists = await _db.agentmaster.AnyAsync(x => x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (exists) return "Code already exists.";
            await _db.agentmaster.AddAsync(new AgentMaster
            {
                branchid = dto.BranchId, code = dto.Code.Trim(), name = dto.Name.Trim(),
                agentlevelid = dto.AgentLevelId, phone = dto.Phone.Trim(), address = dto.Address.Trim(), isactive = dto.IsActive
            });
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> UpdateAsync(AgentMasterDTO dto)
        {
            var entity = await _db.agentmaster.FirstOrDefaultAsync(x => x.id == dto.Id && x.branchid == dto.BranchId);
            if (entity == null) return "Not found.";
            var dup = await _db.agentmaster.AnyAsync(x => x.id != dto.Id && x.branchid == dto.BranchId && x.code.ToLower() == dto.Code.ToLower());
            if (dup) return "Code already exists.";
            entity.code = dto.Code.Trim();
            entity.name = dto.Name.Trim();
            entity.agentlevelid = dto.AgentLevelId;
            entity.phone = dto.Phone.Trim();
            entity.address = dto.Address.Trim();
            entity.isactive = dto.IsActive;
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.agentmaster.FirstOrDefaultAsync(x => x.id == id && x.branchid == branchId);
            if (entity == null) return "Not found.";
            var inUse = await _db.accountagent.AnyAsync(x => x.branchid == branchId && x.agentid == id);
            if (inUse) return "IN_USE";
            _db.agentmaster.Remove(entity);
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
