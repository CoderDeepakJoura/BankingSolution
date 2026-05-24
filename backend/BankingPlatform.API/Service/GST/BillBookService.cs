using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.GST;
using BankingPlatform.Infrastructure.Models.GST;

namespace BankingPlatform.API.Service.GST
{
    public class BillBookService
    {
        private readonly BankingDbContext _context;

        public BillBookService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<string> CreateAsync(BillBookDTO dto)
        {
            var desc = dto.Description?.Trim();
            var prefix = dto.BillNoPrefix?.Trim();

            if (string.IsNullOrEmpty(desc)) return "Description is required.";
            if (string.IsNullOrEmpty(prefix)) return "Bill No. Prefix is required.";

            if (await _context.billbook.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == desc.ToLower()))
                return "Bill Book with this description already exists.";

            dto.Description = desc;
            dto.BillNoPrefix = prefix;
            _context.billbook.Add(MapToEntity(dto));
            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<string> UpdateAsync(BillBookDTO dto)
        {
            var entity = await _context.billbook.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("Bill Book not found.");

            var desc = dto.Description?.Trim();
            var prefix = dto.BillNoPrefix?.Trim();

            if (string.IsNullOrEmpty(desc)) return "Description is required.";
            if (string.IsNullOrEmpty(prefix)) return "Bill No. Prefix is required.";

            if (await _context.billbook.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == desc.ToLower() && x.Id != dto.Id))
                return "Bill Book with this description already exists.";

            entity.Description = desc;
            entity.BillNoPrefix = prefix;
            entity.BillNoFrom = dto.BillNoFrom;
            entity.BillNoGeneration = dto.BillNoGeneration;

            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.billbook.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;
            _context.billbook.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<BillBookDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.billbook.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            return entity == null ? null : MapToDTO(entity);
        }

        public async Task<(List<BillBookDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.billbook.AsNoTracking().Where(x => x.BrId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x => x.Description != null && x.Description.ToLower().Contains(term));
            }

            var total = await query.CountAsync();
            var items = await query.OrderBy(x => x.Description)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return (items.Select(MapToDTO).ToList(), total);
        }

        public async Task<List<BillBookDTO>> GetListAsync(int branchId)
        {
            return await _context.billbook.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.Description)
                .Select(x => new BillBookDTO { Id = x.Id, BranchId = x.BrId, Description = x.Description, BillNoPrefix = x.BillNoPrefix })
                .ToListAsync();
        }

        private static BillBook MapToEntity(BillBookDTO dto) => new()
        {
            BrId = dto.BranchId,
            Description = dto.Description?.Trim(),
            BillNoPrefix = dto.BillNoPrefix?.Trim(),
            BillNoFrom = dto.BillNoFrom,
            BillNoGeneration = dto.BillNoGeneration,
        };

        private static BillBookDTO MapToDTO(BillBook e) => new()
        {
            Id = e.Id,
            BranchId = e.BrId,
            Description = e.Description,
            BillNoPrefix = e.BillNoPrefix,
            BillNoFrom = e.BillNoFrom,
            BillNoGeneration = e.BillNoGeneration,
        };
    }
}
