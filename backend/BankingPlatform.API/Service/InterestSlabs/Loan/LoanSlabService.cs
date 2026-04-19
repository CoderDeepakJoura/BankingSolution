using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.Loan;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.InterestSlabs.Loan;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterestSlabs.Loan
{
    public class LoanSlabService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public LoanSlabService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        // ── CREATE ───────────────────────────────────────────────────────────────

        public async Task<string> CreateLoanSlabAsync(CombinedLoanSlabDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dt) =>
                    DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);

                DateTime slabDate = ToUnspecified(combinedDto.loanSlab.Date);

                var nameExists = await _context.loanslab
                    .AnyAsync(s =>
                        s.BrId == combinedDto.loanSlab.BrId &&
                        s.Name == combinedDto.loanSlab.Name);

                if (nameExists)
                    return "A loan slab with the entered name already exists.";

                var detailValidationError = ValidateSlabDetails(combinedDto.loanSlabDetails);
                if (detailValidationError != null)
                    return detailValidationError;

                combinedDto.loanSlab.Date = slabDate;
                var slab = MapToEntity(combinedDto.loanSlab);
                await _context.loanslab.AddAsync(slab);
                await _context.SaveChangesAsync();

                foreach (var detailDto in combinedDto.loanSlabDetails)
                {
                    var detail = MapDetailToEntity(detailDto);
                    detail.SlabId = slab.Id;
                    detail.BrId = slab.BrId;
                    await _context.loanslabdetail.AddAsync(detail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateLoanSlabAsync), nameof(LoanSlabService));
                return "An error occurred while creating the loan slab.";
            }
        }

        // ── READ ALL (paginated) ─────────────────────────────────────────────────

        public async Task<(List<CombinedLoanSlabDTO> Items, int TotalCount)> GetAllLoanSlabsAsync(
            int brId,
            LocationFilterDTO filter)
        {
            var query = _context.loanslab
                .AsNoTracking()
                .Where(x => x.BrId == brId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();

                var matchingProductIds = await _context.loanproduct
                    .AsNoTracking()
                    .Where(p => p.BrId == brId && p.ProductName.ToLower().Contains(term))
                    .Select(p => p.Id)
                    .ToListAsync();

                query = query.Where(s =>
                    matchingProductIds.Contains(s.LoanProductId) ||
                    s.Name.ToLower().Contains(term) ||
                    s.Date.ToString().Contains(term));
            }

            var totalCount = await query.CountAsync();

            var slabs = await query
                .OrderByDescending(s => s.Date)
                .ThenBy(s => s.LoanProductId)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var slabIds = slabs.Select(s => s.Id).ToList();
            var productIds = slabs.Select(s => s.LoanProductId).Distinct().ToList();

            var slabDetails = await _context.loanslabdetail
                .AsNoTracking()
                .Where(d => slabIds.Contains(d.SlabId) && d.BrId == brId)
                .ToListAsync();

            var products = await _context.loanproduct
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id) && p.BrId == brId)
                .ToDictionaryAsync(p => p.Id, p => p.ProductName);

            var items = slabs.Select(slab => new CombinedLoanSlabDTO
            {
                loanSlab = MapSlabToDTO(slab, products.GetValueOrDefault(slab.LoanProductId)),
                loanSlabDetails = slabDetails
                    .Where(d => d.SlabId == slab.Id)
                    .Select(MapDetailToDTO)
                    .ToList()
            }).ToList();

            return (items, totalCount);
        }

        // ── READ BY ID ───────────────────────────────────────────────────────────

        public async Task<CombinedLoanSlabDTO?> GetLoanSlabByIdAsync(int id, int brId)
        {
            var slab = await _context.loanslab
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.BrId == brId);

            if (slab == null) return null;

            var slabDetails = await _context.loanslabdetail
                .AsNoTracking()
                .Where(d => d.SlabId == id && d.BrId == brId)
                .ToListAsync();

            var productName = await _context.loanproduct
                .AsNoTracking()
                .Where(p => p.Id == slab.LoanProductId && p.BrId == brId)
                .Select(p => p.ProductName)
                .FirstOrDefaultAsync();

            return new CombinedLoanSlabDTO
            {
                loanSlab = MapSlabToDTO(slab, productName),
                loanSlabDetails = slabDetails.Select(MapDetailToDTO).ToList()
            };
        }

        // ── UPDATE ───────────────────────────────────────────────────────────────

        public async Task<string> ModifyLoanSlabAsync(CombinedLoanSlabDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dt) =>
                    DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);

                var existingSlab = await _context.loanslab
                    .FirstOrDefaultAsync(s =>
                        s.Id == combinedDto.loanSlab.Id &&
                        s.BrId == combinedDto.loanSlab.BrId);

                if (existingSlab == null)
                    return "Loan slab not found.";

                var nameExists = await _context.loanslab
                    .AnyAsync(s =>
                        s.BrId == combinedDto.loanSlab.BrId &&
                        s.Name == combinedDto.loanSlab.Name &&
                        s.Id != combinedDto.loanSlab.Id);

                if (nameExists)
                    return "A loan slab with the entered name already exists.";

                var detailValidationError = ValidateSlabDetails(combinedDto.loanSlabDetails);
                if (detailValidationError != null)
                    return detailValidationError;

                combinedDto.loanSlab.Date = ToUnspecified(combinedDto.loanSlab.Date);
                MapToEntity(combinedDto.loanSlab, existingSlab);
                await _context.SaveChangesAsync();

                var existingDetails = await _context.loanslabdetail
                    .Where(d => d.SlabId == existingSlab.Id && d.BrId == existingSlab.BrId)
                    .ToListAsync();

                _context.loanslabdetail.RemoveRange(existingDetails);

                foreach (var detailDto in combinedDto.loanSlabDetails)
                {
                    var detail = MapDetailToEntity(detailDto);
                    detail.SlabId = existingSlab.Id;
                    detail.BrId = existingSlab.BrId;
                    await _context.loanslabdetail.AddAsync(detail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyLoanSlabAsync), nameof(LoanSlabService));
                return "An error occurred while updating the loan slab.";
            }
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        public async Task<bool> DeleteLoanSlabAsync(int id, int brId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var slab = await _context.loanslab
                    .FirstOrDefaultAsync(s => s.Id == id && s.BrId == brId);

                if (slab == null) return false;

                var details = await _context.loanslabdetail
                    .Where(d => d.SlabId == id && d.BrId == brId)
                    .ToListAsync();

                _context.loanslabdetail.RemoveRange(details);
                _context.loanslab.Remove(slab);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteLoanSlabAsync), nameof(LoanSlabService));
                throw;
            }
        }

        // ── Validation ────────────────────────────────────────────────────────────

        private static string? ValidateSlabDetails(List<LoanSlabDetailDTO> details)
        {
            if (details == null || details.Count == 0)
                return "At least one slab detail is required.";

            for (int i = 0; i < details.Count; i++)
            {
                var d = details[i];
                int slab = i + 1;

                if (d.ToAmount <= d.FromAmount)
                    return $"Slab {slab}: To Amount ({d.ToAmount}) must be greater than From Amount ({d.FromAmount}).";

                bool hasMonths = d.PeriodFrom.HasValue && d.PeriodTo.HasValue;
                bool hasDays   = d.PeriodFromInDays.HasValue && d.PeriodToInDays.HasValue;

                if (!hasMonths && !hasDays)
                    return $"Slab {slab}: Either Period From/To (months) or Period From/To (days) must be provided.";

                if (hasMonths && d.PeriodTo <= d.PeriodFrom)
                    return $"Slab {slab}: Period To ({d.PeriodTo}) must be greater than Period From ({d.PeriodFrom}).";

                if (i > 0)
                {
                    var prev = details[i - 1];
                    var expected = prev.ToAmount + 1;
                    if (d.FromAmount != expected)
                        return $"Slab {slab}: From Amount ({d.FromAmount}) must equal previous slab's To Amount + 1 ({expected}).";
                }
            }

            return null;
        }

        // ── Mapping Helpers ───────────────────────────────────────────────────────

        private static LoanSlab MapToEntity(LoanSlabDTO dto, LoanSlab? entity = null)
        {
            entity ??= new LoanSlab();
            entity.BrId = dto.BrId;
            entity.LoanProductId = dto.LoanProductId;
            entity.Name = dto.Name;
            entity.NameSL = dto.NameSL;
            entity.Date = dto.Date;
            return entity;
        }

        private static LoanSlabDTO MapSlabToDTO(LoanSlab entity, string? productName = null) => new()
        {
            Id = entity.Id,
            BrId = entity.BrId,
            LoanProductId = entity.LoanProductId,
            Name = entity.Name,
            NameSL = entity.NameSL,
            Date = entity.Date,
            ProductName = productName,
        };

        private static LoanSlabDetail MapDetailToEntity(LoanSlabDetailDTO dto, LoanSlabDetail? entity = null)
        {
            entity ??= new LoanSlabDetail();
            entity.SlabId = dto.SlabId;
            entity.BrId = dto.BrId;
            entity.FromAmount = dto.FromAmount;
            entity.ToAmount = dto.ToAmount;
            entity.PeriodFrom = dto.PeriodFrom;
            entity.PeriodTo = dto.PeriodTo;
            entity.PeriodFromInDays = dto.PeriodFromInDays;
            entity.PeriodToInDays = dto.PeriodToInDays;
            entity.StdIntRate = dto.StdIntRate;
            entity.PenalIntRate = dto.PenalIntRate;
            return entity;
        }

        private static LoanSlabDetailDTO MapDetailToDTO(LoanSlabDetail entity) => new()
        {
            Id = entity.Id,
            BrId = entity.BrId,
            SlabId = entity.SlabId,
            FromAmount = entity.FromAmount,
            ToAmount = entity.ToAmount,
            PeriodFrom = entity.PeriodFrom,
            PeriodTo = entity.PeriodTo,
            PeriodFromInDays = entity.PeriodFromInDays,
            PeriodToInDays = entity.PeriodToInDays,
            StdIntRate = entity.StdIntRate,
            PenalIntRate = entity.PenalIntRate,
        };
    }
}
