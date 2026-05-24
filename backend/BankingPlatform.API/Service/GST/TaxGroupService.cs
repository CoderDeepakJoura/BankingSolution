using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.GST;
using BankingPlatform.Infrastructure.Models.GST;

namespace BankingPlatform.API.Service.GST
{
    public class TaxGroupService
    {
        private readonly BankingDbContext _context;

        public TaxGroupService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<string> CreateAsync(TaxGroupDTO dto)
        {
            if (dto.SelectedTaxTypeIds == null || dto.SelectedTaxTypeIds.Count == 0)
                return "At least one Tax Type must be selected.";

            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                await _context.taxgroup.AnyAsync(x => x.BrId == dto.BranchId && x.Code != null && x.Code.ToLower() == dto.Code.ToLower()))
                return "Tax Group with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.taxgroup.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower()))
                return "Tax Group with this name already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var entity = MapToEntity(dto);
                _context.taxgroup.Add(entity);
                await _context.SaveChangesAsync();

                await InsertTypesAsync(entity.Id, dto.BranchId, dto.SelectedTaxTypeIds);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "success";
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<string> UpdateAsync(TaxGroupDTO dto)
        {
            if (dto.SelectedTaxTypeIds == null || dto.SelectedTaxTypeIds.Count == 0)
                return "At least one Tax Type must be selected.";

            var entity = await _context.taxgroup.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("Tax Group not found.");

            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                await _context.taxgroup.AnyAsync(x => x.BrId == dto.BranchId && x.Code != null && x.Code.ToLower() == dto.Code.ToLower() && x.Id != dto.Id))
                return "Tax Group with this code already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Description) &&
                await _context.taxgroup.AnyAsync(x => x.BrId == dto.BranchId && x.Description != null && x.Description.ToLower() == dto.Description.ToLower() && x.Id != dto.Id))
                return "Tax Group with this name already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                entity.Description = dto.Description?.Trim();
                entity.DescriptionSL = dto.DescriptionSL?.Trim();
                entity.Code = dto.Code?.Trim();
                entity.PrintingFormat = dto.PrintingFormat;
                entity.IsStateMandatory = dto.IsStateMandatory;
                entity.IsShippingMandatory = dto.IsShippingMandatory;
                entity.IsBillingMandatory = dto.IsBillingMandatory;

                // Replace tax type selections
                var existing = await _context.taxgrouptype
                    .Where(x => x.TaxGroupId == dto.Id && x.BrId == dto.BranchId)
                    .ToListAsync();
                _context.taxgrouptype.RemoveRange(existing);
                await _context.SaveChangesAsync();

                await InsertTypesAsync(dto.Id, dto.BranchId, dto.SelectedTaxTypeIds);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "success";
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.taxgroup.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;

            var types = await _context.taxgrouptype.Where(x => x.TaxGroupId == id && x.BrId == branchId).ToListAsync();
            _context.taxgrouptype.RemoveRange(types);
            _context.taxgroup.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TaxGroupDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.taxgroup.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return null;

            var dto = MapToDTO(entity);
            await EnrichTypesAsync(new List<TaxGroupDTO> { dto }, branchId);
            return dto;
        }

        public async Task<(List<TaxGroupDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.taxgroup.AsNoTracking().Where(x => x.BrId == branchId);

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

            var dtos = items.Select(MapToDTO).ToList();
            return (dtos, total);
        }

        public async Task<List<TaxGroupDTO>> GetListAsync(int branchId)
        {
            return await _context.taxgroup.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.Code)
                .Select(x => new TaxGroupDTO { Id = x.Id, BranchId = x.BrId, Code = x.Code, Description = x.Description })
                .ToListAsync();
        }

        private async Task InsertTypesAsync(int taxGroupId, int branchId, List<int> typeIds)
        {
            foreach (var typeId in typeIds.Distinct())
            {
                _context.taxgrouptype.Add(new TaxGroupType
                {
                    BrId = branchId,
                    TaxGroupId = taxGroupId,
                    TaxTypeId = typeId,
                });
            }
        }

        private async Task EnrichTypesAsync(List<TaxGroupDTO> dtos, int branchId)
        {
            var groupIds = dtos.Select(d => d.Id).ToList();
            var links = await _context.taxgrouptype.AsNoTracking()
                .Where(x => groupIds.Contains(x.TaxGroupId) && x.BrId == branchId)
                .ToListAsync();

            var typeIds = links.Select(l => l.TaxTypeId).Distinct().ToList();
            var types = await _context.taxtype.AsNoTracking()
                .Where(x => typeIds.Contains(x.Id))
                .Select(x => new { x.Id, x.Description, x.Code, x.AppliedIn, x.CalculatedFrom })
                .ToListAsync();

            var typeMap = types.ToDictionary(t => t.Id);

            foreach (var dto in dtos)
            {
                var myLinks = links.Where(l => l.TaxGroupId == dto.Id).ToList();
                dto.SelectedTaxTypeIds = myLinks.Select(l => l.TaxTypeId).ToList();
                dto.TaxGroupTypes = myLinks
                    .Where(l => typeMap.ContainsKey(l.TaxTypeId))
                    .Select(l => new TaxGroupTypeRowDTO
                    {
                        TaxTypeId = l.TaxTypeId,
                        Name = typeMap[l.TaxTypeId].Description,
                        Code = typeMap[l.TaxTypeId].Code,
                        AppliedIn = typeMap[l.TaxTypeId].AppliedIn,
                        CalculatedFrom = typeMap[l.TaxTypeId].CalculatedFrom,
                    }).ToList();
            }
        }

        private static TaxGroup MapToEntity(TaxGroupDTO dto) => new()
        {
            BrId = dto.BranchId,
            Description = dto.Description?.Trim(),
            DescriptionSL = dto.DescriptionSL?.Trim(),
            Code = dto.Code?.Trim(),
            PrintingFormat = dto.PrintingFormat,
            IsStateMandatory = dto.IsStateMandatory,
            IsShippingMandatory = dto.IsShippingMandatory,
            IsBillingMandatory = dto.IsBillingMandatory,
        };

        private static TaxGroupDTO MapToDTO(TaxGroup e) => new()
        {
            Id = e.Id,
            BranchId = e.BrId,
            Description = e.Description,
            DescriptionSL = e.DescriptionSL,
            Code = e.Code,
            PrintingFormat = e.PrintingFormat,
            IsStateMandatory = e.IsStateMandatory,
            IsShippingMandatory = e.IsShippingMandatory,
            IsBillingMandatory = e.IsBillingMandatory,
        };
    }
}
