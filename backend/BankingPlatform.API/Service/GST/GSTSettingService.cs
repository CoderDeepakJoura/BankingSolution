using BankingPlatform.API.DTO.GST;
using BankingPlatform.Infrastructure.Models.GST;

namespace BankingPlatform.API.Service.GST
{
    public class GSTSettingService
    {
        private readonly BankingDbContext _context;

        public GSTSettingService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<GSTSettingDTO?> GetAsync(int branchId)
        {
            var setting = await _context.gstsetting.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BrId == branchId);

            if (setting == null) return null;

            var accIds = new[] { setting.RoundOffExpAccId, setting.RoundOffIncAccId };
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => accIds.Contains(x.ID))
                .Select(x => new { x.ID, x.AccountNumber, x.AccountName })
                .ToListAsync();

            var expAcc = accounts.FirstOrDefault(x => x.ID == setting.RoundOffExpAccId);
            var incAcc = accounts.FirstOrDefault(x => x.ID == setting.RoundOffIncAccId);

            return new GSTSettingDTO
            {
                BranchId = setting.BrId,
                RoundOffExpAccId = setting.RoundOffExpAccId,
                RoundOffIncAccId = setting.RoundOffIncAccId,
                RoundOffExpAccDisplay = expAcc != null ? $"{expAcc.AccountNumber} - {expAcc.AccountName}" : null,
                RoundOffIncAccDisplay = incAcc != null ? $"{incAcc.AccountNumber} - {incAcc.AccountName}" : null,
            };
        }

        public async Task<string> SaveAsync(GSTSettingDTO dto)
        {
            if (dto.RoundOffExpAccId == 0) return "Round Off Exp. A/c is required.";
            if (dto.RoundOffIncAccId == 0) return "Round Off Inc. A/c is required.";
            if (dto.RoundOffExpAccId == dto.RoundOffIncAccId) return "Round Off Exp. A/c and Round Off Inc. A/c cannot be the same.";

            var existing = await _context.gstsetting.FirstOrDefaultAsync(x => x.BrId == dto.BranchId);
            if (existing == null)
            {
                _context.gstsetting.Add(new GSTSetting
                {
                    BrId = dto.BranchId,
                    RoundOffExpAccId = dto.RoundOffExpAccId,
                    RoundOffIncAccId = dto.RoundOffIncAccId,
                });
            }
            else
            {
                existing.RoundOffExpAccId = dto.RoundOffExpAccId;
                existing.RoundOffIncAccId = dto.RoundOffIncAccId;
            }

            await _context.SaveChangesAsync();
            return "success";
        }
    }
}
