using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.NPA;
using BankingPlatform.Infrastructure.Models.NPA;

namespace BankingPlatform.API.Service.NPA
{
    public class NPAPlanMasterService
    {
        private readonly BankingDbContext _context;

        public NPAPlanMasterService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<string> CreateAsync(NPAPlanMasterDTO dto)
        {
            if (await _context.npaplanmaster.AnyAsync(x => x.BrId == dto.BranchId && x.Code.ToLower() == dto.Code.ToLower()))
                return "NPA Plan with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.npaplanmaster.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower()))
                return "NPA Plan with this name already exists.";

            _context.npaplanmaster.Add(MapToEntity(dto));
            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<string> UpdateAsync(NPAPlanMasterDTO dto)
        {
            var entity = await _context.npaplanmaster.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("NPA Plan not found.");

            if (await _context.npaplanmaster.AnyAsync(x => x.BrId == dto.BranchId && x.Code.ToLower() == dto.Code.ToLower() && x.Id != dto.Id))
                return "NPA Plan with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.npaplanmaster.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower() && x.Id != dto.Id))
                return "NPA Plan with this name already exists.";

            entity.Code = dto.Code;
            entity.Description = dto.Description;
            entity.CalNPADate = dto.CalNPADate;
            entity.OvrDuePeriodOrInst = dto.OvrDuePeriodOrInst;
            entity.CalNPAFromLoanDate = dto.CalNPAFromLoanDate;

            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.npaplanmaster.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;

            _context.npaplanmaster.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<NPAPlanMasterDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.npaplanmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            return entity == null ? null : MapToDTO(entity);
        }

        public async Task<(List<NPAPlanMasterDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.npaplanmaster.AsNoTracking().Where(x => x.BrId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x => x.Code.ToLower().Contains(term) || (x.Description != null && x.Description.ToLower().Contains(term)));
            }

            var total = await query.CountAsync();
            var items = await query.OrderBy(x => x.Code)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return (items.Select(MapToDTO).ToList(), total);
        }

        public async Task<List<NPAPlanMasterListItemDTO>> GetListAsync(int branchId)
        {
            return await _context.npaplanmaster.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.Code)
                .Select(x => new NPAPlanMasterListItemDTO { Id = x.Id, Code = x.Code, Description = x.Description })
                .ToListAsync();
        }

        private static NPAPlanMaster MapToEntity(NPAPlanMasterDTO dto) => new()
        {
            Id = dto.Id,
            BrId = dto.BranchId,
            Code = dto.Code,
            Description = dto.Description,
            CalNPADate = dto.CalNPADate,
            OvrDuePeriodOrInst = dto.OvrDuePeriodOrInst,
            CalNPAFromLoanDate = dto.CalNPAFromLoanDate,
        };

        private static NPAPlanMasterDTO MapToDTO(NPAPlanMaster e) => new()
        {
            Id = e.Id,
            BranchId = e.BrId,
            Code = e.Code,
            Description = e.Description,
            CalNPADate = e.CalNPADate,
            OvrDuePeriodOrInst = e.OvrDuePeriodOrInst,
            CalNPAFromLoanDate = e.CalNPAFromLoanDate,
        };
    }
}
