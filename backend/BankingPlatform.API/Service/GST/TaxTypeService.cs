using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.GST;
using BankingPlatform.Infrastructure.Models.GST;

namespace BankingPlatform.API.Service.GST
{
    public class TaxTypeService
    {
        private readonly BankingDbContext _context;

        public TaxTypeService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<List<AccountLookupDTO>> GetAccountListAsync(int branchId)
        {
            int generalType = 3; // Enums.AccountTypes.General
            return await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccTypeId == generalType && !x.IsAccClosed)
                .OrderBy(x => x.AccountNumber)
                .Select(x => new AccountLookupDTO
                {
                    Id = x.ID,
                    AccountNumber = x.AccountNumber,
                    AccountName = x.AccountName,
                })
                .ToListAsync();
        }

        public async Task<string> CreateAsync(TaxTypeDTO dto)
        {
            if (dto.InAccId != 0 && dto.InAccId == dto.OutAccId)
                return "In Account and Out Account cannot be the same.";

            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                await _context.taxtype.AnyAsync(x => x.BrId == dto.BranchId && x.Code != null && x.Code.ToLower() == dto.Code.ToLower()))
                return "Tax Type with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.taxtype.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower()))
                return "Tax Type with this name already exists.";

            _context.taxtype.Add(MapToEntity(dto));
            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<string> UpdateAsync(TaxTypeDTO dto)
        {
            var entity = await _context.taxtype.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("Tax Type not found.");

            if (dto.InAccId != 0 && dto.InAccId == dto.OutAccId)
                return "In Account and Out Account cannot be the same.";

            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                await _context.taxtype.AnyAsync(x => x.BrId == dto.BranchId && x.Code != null && x.Code.ToLower() == dto.Code.ToLower() && x.Id != dto.Id))
                return "Tax Type with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.taxtype.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower() && x.Id != dto.Id))
                return "Tax Type with this name already exists.";

            entity.Description = dto.Description?.Trim();
            entity.DescriptionSL = dto.DescriptionSL?.Trim();
            entity.Code = dto.Code?.Trim();
            entity.AppliedIn = dto.AppliedIn;
            entity.IsUT = dto.IsUT;
            entity.CalculatedFrom = dto.CalculatedFrom;
            entity.SeqNo = dto.SeqNo;
            entity.InAccId = dto.InAccId;
            entity.OutAccId = dto.OutAccId;

            await _context.SaveChangesAsync();
            return "success";
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.taxtype.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;
            _context.taxtype.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TaxTypeDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.taxtype.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return null;

            var dto = MapToDTO(entity);
            await EnrichDisplayAsync(new List<TaxTypeDTO> { dto }, branchId);
            return dto;
        }

        public async Task<(List<TaxTypeDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.taxtype.AsNoTracking().Where(x => x.BrId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x =>
                    (x.Description != null && x.Description.ToLower().Contains(term)) ||
                    (x.Code != null && x.Code.ToLower().Contains(term)));
            }

            var total = await query.CountAsync();
            var items = await query.OrderBy(x => x.SeqNo).ThenBy(x => x.Code)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var dtos = items.Select(MapToDTO).ToList();
            await EnrichDisplayAsync(dtos, branchId);
            return (dtos, total);
        }

        public async Task<List<TaxTypeDTO>> GetListAsync(int branchId)
        {
            return await _context.taxtype.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.SeqNo)
                .Select(x => new TaxTypeDTO
                {
                    Id = x.Id,
                    BranchId = x.BrId,
                    Code = x.Code,
                    Description = x.Description,
                    AppliedIn = x.AppliedIn,
                    CalculatedFrom = x.CalculatedFrom,
                })
                .ToListAsync();
        }

        private async Task EnrichDisplayAsync(List<TaxTypeDTO> dtos, int branchId)
        {
            var accIds = dtos.SelectMany(d => new[] { d.InAccId, d.OutAccId }).Distinct().Where(x => x > 0).ToList();
            if (accIds.Count == 0) return;

            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => accIds.Contains(x.ID))
                .Select(x => new { x.ID, x.AccountNumber, x.AccountName })
                .ToListAsync();

            var map = accounts.ToDictionary(x => x.ID, x => $"{x.AccountNumber} - {x.AccountName}");
            foreach (var dto in dtos)
            {
                if (map.TryGetValue(dto.InAccId, out var inDisp)) dto.InAccDisplay = inDisp;
                if (map.TryGetValue(dto.OutAccId, out var outDisp)) dto.OutAccDisplay = outDisp;
            }
        }

        private static TaxType MapToEntity(TaxTypeDTO dto) => new()
        {
            BrId = dto.BranchId,
            Description = dto.Description?.Trim(),
            DescriptionSL = dto.DescriptionSL?.Trim(),
            Code = dto.Code?.Trim(),
            AppliedIn = dto.AppliedIn,
            IsUT = dto.IsUT,
            CalculatedFrom = dto.CalculatedFrom,
            SeqNo = dto.SeqNo,
            InAccId = dto.InAccId,
            OutAccId = dto.OutAccId,
        };

        private static TaxTypeDTO MapToDTO(TaxType e) => new()
        {
            Id = e.Id,
            BranchId = e.BrId,
            Description = e.Description,
            DescriptionSL = e.DescriptionSL,
            Code = e.Code,
            AppliedIn = e.AppliedIn,
            IsUT = e.IsUT,
            CalculatedFrom = e.CalculatedFrom,
            SeqNo = e.SeqNo,
            InAccId = e.InAccId,
            OutAccId = e.OutAccId,
        };
    }
}
