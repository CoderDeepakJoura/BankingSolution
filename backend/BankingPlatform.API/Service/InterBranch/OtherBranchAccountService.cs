using BankingPlatform.API.DTO.Miscalleneous;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterBranch
{
    public class OtherBranchAccountService
    {
        private readonly BankingDbContext _db;

        public OtherBranchAccountService(BankingDbContext db)
        {
            _db = db;
        }

        public async Task<List<OtherBranchAccountDTO>> GetAllAsync(int branchId)
        {
            return await (
                from oba in _db.otherbranchaccounts.AsNoTracking()
                join br in _db.branchmaster.AsNoTracking() on oba.OtherBrId equals br.id
                join acc in _db.accountmaster.AsNoTracking() on oba.AccId equals acc.ID
                where oba.BrId == branchId
                select new OtherBranchAccountDTO
                {
                    Id            = oba.Id,
                    BrId          = oba.BrId,
                    OtherBrId     = oba.OtherBrId,
                    AccId         = oba.AccId,
                    OtherBranchCode = br.branchmaster_code,
                    OtherBranchName = br.branchmaster_name,
                    AccountName   = acc.AccountName
                }
            ).ToListAsync();
        }

        public async Task<string> CreateAsync(OtherBranchAccountDTO dto)
        {
            bool exists = await _db.otherbranchaccounts
                .AnyAsync(x => x.BrId == dto.BrId && x.OtherBrId == dto.OtherBrId);
            if (exists)
                return "A mapping for this branch pair already exists.";

            _db.otherbranchaccounts.Add(new OtherBranchAccount
            {
                BrId      = dto.BrId,
                OtherBrId = dto.OtherBrId,
                AccId     = dto.AccId
            });
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> UpdateAsync(OtherBranchAccountDTO dto)
        {
            var entity = await _db.otherbranchaccounts
                .FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BrId);
            if (entity == null) return "Record not found.";

            bool pairConflict = await _db.otherbranchaccounts
                .AnyAsync(x => x.BrId == dto.BrId && x.OtherBrId == dto.OtherBrId && x.Id != dto.Id);
            if (pairConflict)
                return "A mapping for this branch pair already exists.";

            entity.OtherBrId = dto.OtherBrId;
            entity.AccId     = dto.AccId;
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAsync(int id, int branchId)
        {
            var entity = await _db.otherbranchaccounts
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return "Record not found.";

            _db.otherbranchaccounts.Remove(entity);
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
