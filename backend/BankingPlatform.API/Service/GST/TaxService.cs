using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.GST;
using BankingPlatform.Infrastructure.Models.GST;

namespace BankingPlatform.API.Service.GST
{
    public class TaxService
    {
        private readonly BankingDbContext _context;

        private static readonly Dictionary<int, string> _evalOnMap = new()
        {
            { 1, "GrossAmount" },
            { 2, "ParentTax" },
        };

        private static readonly Dictionary<int, string> _tcMap = new()
        {
            { 1, "Taxable" },
            { 2, "Nil Rated" },
            { 3, "Exempted" },
        };

        public TaxService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<string> CreateAsync(TaxDTO dto)
        {
            if (dto.Details == null || dto.Details.Count == 0)
                return "At least one Tax Detail is required.";

            if (!string.IsNullOrWhiteSpace(dto.Name) &&
                await _context.tax.AnyAsync(x => x.BrId == dto.BranchId && x.Name != null && x.Name.ToLower() == dto.Name.ToLower()))
                return "Tax with this name already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Alias) &&
                await _context.tax.AnyAsync(x => x.BrId == dto.BranchId && x.Alias != null && x.Alias.ToLower() == dto.Alias.ToLower()))
                return "Tax with this alias already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var entity = MapToEntity(dto);
                _context.tax.Add(entity);
                await _context.SaveChangesAsync();

                await InsertDetailsAsync(entity.Id, dto.BranchId, dto.Details);
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

        public async Task<string> UpdateAsync(TaxDTO dto)
        {
            if (dto.Details == null || dto.Details.Count == 0)
                return "At least one Tax Detail is required.";

            var entity = await _context.tax.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("Tax not found.");

            if (!string.IsNullOrWhiteSpace(dto.Name) &&
                await _context.tax.AnyAsync(x => x.BrId == dto.BranchId && x.Name != null && x.Name.ToLower() == dto.Name.ToLower() && x.Id != dto.Id))
                return "Tax with this name already exists.";

            if (!string.IsNullOrWhiteSpace(dto.Alias) &&
                await _context.tax.AnyAsync(x => x.BrId == dto.BranchId && x.Alias != null && x.Alias.ToLower() == dto.Alias.ToLower() && x.Id != dto.Id))
                return "Tax with this alias already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                entity.Name = dto.Name?.Trim();
                entity.NameSL = dto.NameSL?.Trim();
                entity.Alias = dto.Alias?.Trim();
                entity.AliasSL = dto.AliasSL?.Trim();
                entity.IntroductionDate = dto.IntroductionDate;
                entity.TaxPercentage = dto.TaxPercentage;
                // TCId and TaxGroupId are not editable in modify mode

                var existing = await _context.taxdetail
                    .Where(x => x.TaxId == dto.Id && x.BrId == dto.BranchId)
                    .ToListAsync();
                _context.taxdetail.RemoveRange(existing);
                await _context.SaveChangesAsync();

                await InsertDetailsAsync(dto.Id, dto.BranchId, dto.Details);
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
            var entity = await _context.tax.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;

            var details = await _context.taxdetail.Where(x => x.TaxId == id && x.BrId == branchId).ToListAsync();
            _context.taxdetail.RemoveRange(details);
            _context.tax.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TaxDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.tax.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return null;

            var dto = MapToDTO(entity);
            await EnrichAsync(new List<TaxDTO> { dto }, branchId);
            return dto;
        }

        public async Task<(List<TaxDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.tax.AsNoTracking().Where(x => x.BrId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x =>
                    (x.Name != null && x.Name.ToLower().Contains(term)) ||
                    (x.Alias != null && x.Alias.ToLower().Contains(term)));
            }

            var total = await query.CountAsync();
            var items = await query.OrderBy(x => x.Name)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var dtos = items.Select(MapToDTO).ToList();
            await EnrichAsync(dtos, branchId);
            return (dtos, total);
        }

        public async Task<List<TaxDTO>> GetListAsync(int branchId)
        {
            return await _context.tax.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.Name)
                .Select(x => new TaxDTO { Id = x.Id, BranchId = x.BrId, Name = x.Name, Alias = x.Alias, TaxPercentage = x.TaxPercentage })
                .ToListAsync();
        }

        private async Task EnrichAsync(List<TaxDTO> dtos, int branchId)
        {
            var ids = dtos.Select(d => d.Id).ToList();
            var details = await _context.taxdetail.AsNoTracking()
                .Where(x => ids.Contains(x.TaxId) && x.BrId == branchId)
                .ToListAsync();

            var typeIds = details.Select(d => d.TaxTypeId).Distinct().ToList();
            var types = await _context.taxtype.AsNoTracking()
                .Where(x => typeIds.Contains(x.Id))
                .Select(x => new { x.Id, x.Description, x.Code })
                .ToListAsync();
            var typeMap = types.ToDictionary(t => t.Id);

            var groupIds = dtos.Where(d => d.TaxGroupId.HasValue).Select(d => d.TaxGroupId!.Value).Distinct().ToList();
            var groups = await _context.taxgroup.AsNoTracking()
                .Where(x => groupIds.Contains(x.Id))
                .Select(x => new { x.Id, x.Description })
                .ToListAsync();
            var groupMap = groups.ToDictionary(g => g.Id, g => g.Description);

            foreach (var dto in dtos)
            {
                _tcMap.TryGetValue(dto.TCId, out var tcName);
                dto.TaxCategoryName = tcName;

                if (dto.TaxGroupId.HasValue && groupMap.TryGetValue(dto.TaxGroupId.Value, out var grpName))
                    dto.TaxGroupName = grpName;

                dto.Details = details
                    .Where(d => d.TaxId == dto.Id)
                    .Select(d =>
                    {
                        _evalOnMap.TryGetValue(d.EvaluatedOn, out var evalName);
                        typeMap.TryGetValue(d.TaxTypeId, out var tt);
                        return new TaxDetailDTO
                        {
                            Id = d.Id,
                            BranchId = d.BrId,
                            TaxId = d.TaxId,
                            DetailDate = d.DetailDate,
                            TaxTypeId = d.TaxTypeId,
                            NRatio = d.NRatio,
                            DRatio = d.DRatio,
                            EvaluatedOn = d.EvaluatedOn,
                            Percentage = d.Percentage,
                            TaxTypeName = tt != null ? $"{tt.Description}-{tt.Code}" : null,
                            EvaluatedOnName = evalName,
                        };
                    }).ToList();
            }
        }

        private async Task InsertDetailsAsync(int taxId, int branchId, List<TaxDetailDTO> details)
        {
            foreach (var d in details)
            {
                _context.taxdetail.Add(new TaxDetail
                {
                    BrId = branchId,
                    TaxId = taxId,
                    DetailDate = d.DetailDate,
                    TaxTypeId = d.TaxTypeId,
                    NRatio = d.NRatio,
                    DRatio = d.DRatio,
                    EvaluatedOn = d.EvaluatedOn,
                    Percentage = d.Percentage,
                });
            }
        }

        private static Tax MapToEntity(TaxDTO dto) => new()
        {
            BrId = dto.BranchId,
            Name = dto.Name?.Trim(),
            NameSL = dto.NameSL?.Trim(),
            Alias = dto.Alias?.Trim(),
            AliasSL = dto.AliasSL?.Trim(),
            IntroductionDate = dto.IntroductionDate,
            TaxPercentage = dto.TaxPercentage,
            TCId = dto.TCId,
            TaxGroupId = dto.TaxGroupId,
        };

        private static TaxDTO MapToDTO(Tax e) => new()
        {
            Id = e.Id,
            BranchId = e.BrId,
            Name = e.Name,
            NameSL = e.NameSL,
            Alias = e.Alias,
            AliasSL = e.AliasSL,
            IntroductionDate = e.IntroductionDate,
            TaxPercentage = e.TaxPercentage,
            TCId = e.TCId,
            TaxGroupId = e.TaxGroupId,
        };
    }
}
