using BankingPlatform.API.DTO.Services;
using BankingPlatform.Infrastructure.Models.Services;

namespace BankingPlatform.API.Service.Services
{
    public class AccServiceDetailService
    {
        private readonly BankingDbContext _context;

        public AccServiceDetailService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<List<AccServiceDetailDTO>> GetAllAsync(int branchId)
        {
            var items = await _context.accservicedetail.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .ToListAsync();

            var accIds = items.Select(x => x.AccId).Distinct().ToList();
            var svcIds = items.Select(x => x.ServiceId).Distinct().ToList();

            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => accIds.Contains(x.ID))
                .Select(x => new { x.ID, x.AccountNumber, x.AccountName })
                .ToListAsync();

            var services = await _context.service.AsNoTracking()
                .Where(x => svcIds.Contains(x.Id) && x.BrId == branchId)
                .Select(x => new { x.Id, x.Name })
                .ToListAsync();

            var accMap = accounts.ToDictionary(x => x.ID, x => $"{x.AccountNumber} - {x.AccountName}");
            var svcMap = services.ToDictionary(x => x.Id, x => x.Name ?? "");

            return items.Select(x => new AccServiceDetailDTO
            {
                Id = x.Id,
                BranchId = x.BrId,
                AccId = x.AccId,
                ServiceId = x.ServiceId,
                AccDisplay = accMap.TryGetValue(x.AccId, out var a) ? a : null,
                ServiceName = svcMap.TryGetValue(x.ServiceId, out var s) ? s : null,
            }).ToList();
        }

        public async Task<string> AddAsync(AccServiceDetailDTO dto)
        {
            if (dto.AccId == 0) return "Account is required.";
            if (dto.ServiceId == 0) return "Service is required.";

            if (await _context.accservicedetail.AnyAsync(x => x.BrId == dto.BranchId && x.AccId == dto.AccId && x.ServiceId == dto.ServiceId))
                return "This account is already assigned to the selected service.";

            _context.accservicedetail.Add(new AccServiceDetail
            {
                BrId = dto.BranchId,
                AccId = dto.AccId,
                ServiceId = dto.ServiceId,
            });
            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.accservicedetail.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;
            _context.accservicedetail.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
