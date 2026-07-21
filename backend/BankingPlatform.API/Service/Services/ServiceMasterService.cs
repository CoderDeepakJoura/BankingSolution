using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Services;
using BankingPlatform.Infrastructure.Models.Services;

namespace BankingPlatform.API.Service.Services
{
    public class ServiceMasterService
    {
        private readonly BankingDbContext _context;

        public ServiceMasterService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<string> CreateAsync(ServiceDTO dto)
        {
            var name = dto.Name?.Trim();
            if (string.IsNullOrEmpty(name)) return "Name is required.";
            if (string.IsNullOrWhiteSpace(dto.SAC)) return "SAC(TC) is required.";
            if (dto.PurchaseAccId == 0) return "Purchase Account is required.";
            if (dto.TaxRules.Count == 0) return "At least one Tax Detail is required.";

            if (await _context.service.AnyAsync(x => x.BrId == dto.BranchId && x.Name != null && x.Name.ToLower() == name.ToLower()))
                return "Service with this name already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var entity = new ServiceMaster
                {
                    BrId = dto.BranchId,
                    Name = name,
                    SAC = dto.SAC?.Trim(),
                    OtherReceipts = dto.OtherReceipts,
                    DeductRefunds = dto.DeductRefunds,
                    Penalties = dto.Penalties,
                    IsIncludeTax = dto.IsIncludeTax,
                    PurchaseAccId = dto.PurchaseAccId,
                };
                _context.service.Add(entity);
                await _context.SaveChangesAsync();

                foreach (var r in dto.TaxRules)
                    _context.servicetaxrule.Add(new ServiceTaxRule { BrId = dto.BranchId, ServiceId = entity.Id, ApplicableDate = DateTime.Parse(r.ApplicableDate), TaxId = r.TaxId });

                foreach (var t in dto.TaxTypeDets)
                    _context.servicetaxtypedet.Add(new ServiceTaxTypeDet { BrId = dto.BranchId, ServiceId = entity.Id, Date = DateTime.Parse(t.Date), TaxTypeId = t.TaxTypeId, Perc = t.Perc });

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "success";
            }
            catch { await tx.RollbackAsync(); throw; }
        }

        public async Task<string> UpdateAsync(ServiceDTO dto)
        {
            var entity = await _context.service.FirstOrDefaultAsync(x => x.Id == dto.Id && x.BrId == dto.BranchId)
                ?? throw new Exception("Service not found.");

            var name = dto.Name?.Trim();
            if (string.IsNullOrEmpty(name)) return "Name is required.";
            if (string.IsNullOrWhiteSpace(dto.SAC)) return "SAC(TC) is required.";
            if (dto.PurchaseAccId == 0) return "Purchase Account is required.";

            if (await _context.service.AnyAsync(x => x.BrId == dto.BranchId && x.Name != null && x.Name.ToLower() == name.ToLower() && x.Id != dto.Id))
                return "Service with this name already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                entity.Name = name;
                entity.SAC = dto.SAC?.Trim();
                entity.OtherReceipts = dto.OtherReceipts;
                entity.DeductRefunds = dto.DeductRefunds;
                entity.Penalties = dto.Penalties;
                entity.IsIncludeTax = dto.IsIncludeTax;
                entity.PurchaseAccId = dto.PurchaseAccId;

                var oldRules = await _context.servicetaxrule.Where(x => x.ServiceId == dto.Id && x.BrId == dto.BranchId).ToListAsync();
                _context.servicetaxrule.RemoveRange(oldRules);

                var oldDets = await _context.servicetaxtypedet.Where(x => x.ServiceId == dto.Id && x.BrId == dto.BranchId).ToListAsync();
                _context.servicetaxtypedet.RemoveRange(oldDets);

                foreach (var r in dto.TaxRules)
                    _context.servicetaxrule.Add(new ServiceTaxRule { BrId = dto.BranchId, ServiceId = dto.Id, ApplicableDate = DateTime.Parse(r.ApplicableDate), TaxId = r.TaxId });

                foreach (var t in dto.TaxTypeDets)
                    _context.servicetaxtypedet.Add(new ServiceTaxTypeDet { BrId = dto.BranchId, ServiceId = dto.Id, Date = DateTime.Parse(t.Date), TaxTypeId = t.TaxTypeId, Perc = t.Perc });

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "success";
            }
            catch { await tx.RollbackAsync(); throw; }
        }

        public async Task<bool> DeleteAsync(int id, int branchId)
        {
            var entity = await _context.service.FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return false;

            var rules = await _context.servicetaxrule.Where(x => x.ServiceId == id && x.BrId == branchId).ToListAsync();
            _context.servicetaxrule.RemoveRange(rules);
            var dets = await _context.servicetaxtypedet.Where(x => x.ServiceId == id && x.BrId == branchId).ToListAsync();
            _context.servicetaxtypedet.RemoveRange(dets);
            _context.service.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ServiceDTO?> GetByIdAsync(int id, int branchId)
        {
            var entity = await _context.service.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.BrId == branchId);
            if (entity == null) return null;
            return await EnrichAsync(entity);
        }

        public async Task<(List<ServiceDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.service.AsNoTracking().Where(x => x.BrId == branchId);
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(x => x.Name != null && x.Name.ToLower().Contains(term));
            }
            var total = await query.CountAsync();
            var items = await query.OrderBy(x => x.Name).Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToListAsync();
            var dtos = new List<ServiceDTO>();
            foreach (var item in items) dtos.Add(await EnrichAsync(item));
            return (dtos, total);
        }

        public async Task<List<ServiceDTO>> GetListAsync(int branchId)
        {
            return await _context.service.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.Name)
                .Select(x => new ServiceDTO { Id = x.Id, BranchId = x.BrId, Name = x.Name })
                .ToListAsync();
        }

        private async Task<ServiceDTO> EnrichAsync(ServiceMaster entity)
        {
            var acc = await _context.accountmaster.AsNoTracking().FirstOrDefaultAsync(x => x.ID == entity.PurchaseAccId);
            var rules = await _context.servicetaxrule.AsNoTracking().Where(x => x.ServiceId == entity.Id && x.BrId == entity.BrId).ToListAsync();
            var dets = await _context.servicetaxtypedet.AsNoTracking().Where(x => x.ServiceId == entity.Id && x.BrId == entity.BrId).ToListAsync();

            var taxIds = rules.Select(r => r.TaxId).Distinct().ToList();
            var taxes = await _context.tax.AsNoTracking().Where(x => taxIds.Contains(x.Id)).Select(x => new { x.Id, x.Name }).ToListAsync();
            var taxMap = taxes.ToDictionary(x => x.Id, x => x.Name ?? "");

            var ttIds = dets.Select(d => d.TaxTypeId).Distinct().ToList();
            var taxTypes = await _context.taxtype.AsNoTracking().Where(x => ttIds.Contains(x.Id)).Select(x => new { x.Id, x.Description, x.Code }).ToListAsync();
            var ttMap = taxTypes.ToDictionary(x => x.Id, x => $"{x.Description}-{x.Code}");

            return new ServiceDTO
            {
                Id = entity.Id,
                BranchId = entity.BrId,
                Name = entity.Name,
                SAC = entity.SAC,
                OtherReceipts = entity.OtherReceipts,
                DeductRefunds = entity.DeductRefunds,
                Penalties = entity.Penalties,
                IsIncludeTax = entity.IsIncludeTax,
                PurchaseAccId = entity.PurchaseAccId,
                PurchaseAccDisplay = acc != null ? $"{acc.AccountNumber} - {acc.AccountName}" : null,
                TaxRules = rules.Select(r => new ServiceTaxRuleDTO
                {
                    Id = r.Id,
                    ApplicableDate = r.ApplicableDate.ToString("yyyy-MM-dd"),
                    TaxId = r.TaxId,
                    TaxName = taxMap.TryGetValue(r.TaxId, out var tn) ? tn : null,
                }).ToList(),
                TaxTypeDets = dets.Select(d => new ServiceTaxTypeDetDTO
                {
                    Id = d.Id,
                    Date = d.Date.ToString("yyyy-MM-dd"),
                    TaxTypeId = d.TaxTypeId,
                    TaxTypeName = ttMap.TryGetValue(d.TaxTypeId, out var ttn) ? ttn : null,
                    Perc = d.Perc,
                }).ToList(),
            };
        }
    }
}
