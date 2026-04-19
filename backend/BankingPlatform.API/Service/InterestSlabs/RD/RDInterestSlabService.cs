using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.RD;
using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;
using BankingPlatform.Infrastructure.Models.InterestSlabs.RD;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.InterestSlabs.RD
{
    public class RDInterestSlabService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public RDInterestSlabService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        // ── CREATE ───────────────────────────────────────────────────────────────

        public async Task<string> CreateInterestSlabAsync(CombinedRDIntDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dt) =>
                    DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);

                DateTime applicableDate = ToUnspecified(combinedDto.rdInterestSlab.ApplicableDate);

                // Duplicate check: same product + date on or after selected date
                var existingSlab = await _context.rdinterestslab
                    .FirstOrDefaultAsync(s =>
                        s.BranchId == combinedDto.rdInterestSlab.BranchId &&
                        s.RDProductId == combinedDto.rdInterestSlab.RDProductId &&
                        s.ApplicableDate >= applicableDate);

                if (existingSlab != null)
                    return "An interest slab for this product already exists with an applicable date " +
                           "on or after the selected date. Please use a future date or modify the existing slab.";

                var nameExists = await _context.rdinterestslab
                    .AnyAsync(s =>
                        s.BranchId == combinedDto.rdInterestSlab.BranchId &&
                        s.SlabName == combinedDto.rdInterestSlab.SlabName);

                if(nameExists)
                    return "An interest slab for entered name already exists.";

                // Cross-field slab detail validation
                var detailValidationError = ValidateSlabDetails(combinedDto.rdInterestSlabDetails);
                if (detailValidationError != null)
                    return detailValidationError;

                // Create header record
                combinedDto.rdInterestSlab.ApplicableDate = applicableDate;
                var interestSlab = MapToEntity(combinedDto.rdInterestSlab);
                await _context.rdinterestslab.AddAsync(interestSlab);
                await _context.SaveChangesAsync();

                // Create detail rows
                foreach (var detailDto in combinedDto.rdInterestSlabDetails)
                {
                    var detail = MapDetailToEntity(detailDto);
                    detail.RDIntSlabId = interestSlab.Id;   // assign FK after header is saved
                    detail.BranchId = interestSlab.BranchId;
                    await _context.rdinterestslabdetail.AddAsync(detail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateInterestSlabAsync), nameof(RDInterestSlabService));
                return "An error occurred while creating the interest slab.";
            }
        }

        // ── READ ALL (paginated) ─────────────────────────────────────────────────

        public async Task<(List<CombinedRDIntDTO> Items, int TotalCount)> GetAllRDInterestSlabsAsync(
            int branchId,
            LocationFilterDTO filter)
        {
            var query = _context.rdinterestslab
                .AsNoTracking()
                .Where(x => x.BranchId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();

                var matchingProductIds = await _context.rdproduct
                    .AsNoTracking()
                    .Where(p => p.BrId == branchId &&
                                p.ProductName.ToLower().Contains(term))
                    .Select(p => p.Id)
                    .ToListAsync();

                query = query.Where(s =>
                    matchingProductIds.Contains(s.RDProductId) ||
                    s.SlabName.ToLower().Contains(term) ||
                    s.ApplicableDate.ToString().Contains(term));
            }

            var totalCount = await query.CountAsync();

            var slabs = await query
                .OrderByDescending(s => s.ApplicableDate)
                .ThenBy(s => s.RDProductId)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var slabIds = slabs.Select(s => s.Id).ToList();
            var productIds = slabs.Select(s => s.RDProductId).Distinct().ToList();

            // Batch load details and products
            var slabDetails = await _context.rdinterestslabdetail
                .AsNoTracking()
                .Where(d => slabIds.Contains(d.RDIntSlabId) && d.BranchId == branchId)
                .OrderBy(d => d.SlabNo)
                .ToListAsync();

            var products = await _context.rdproduct
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id) && p.BrId == branchId)
                .ToDictionaryAsync(p => p.Id, p => p.ProductName);

            var items = slabs.Select(slab => new CombinedRDIntDTO
            {
                rdInterestSlab = MapSlabToDTO(slab, products.GetValueOrDefault(slab.RDProductId)),
                rdInterestSlabDetails = slabDetails
                    .Where(d => d.RDIntSlabId == slab.Id)
                    .Select(MapDetailToDTO)
                    .ToList()
            }).ToList();

            return (items, totalCount);
        }

        // ── READ BY ID ───────────────────────────────────────────────────────────

        public async Task<CombinedRDIntDTO?> GetRDInterestSlabByIdAsync(int id, int branchId)
        {
            var slab = await _context.rdinterestslab
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (slab == null) return null;

            var slabDetails = await _context.rdinterestslabdetail
                .AsNoTracking()
                .Where(d => d.RDIntSlabId == id && d.BranchId == branchId)
                .OrderBy(d => d.SlabNo)
                .ToListAsync();

            var productName = await _context.rdproduct
                .AsNoTracking()
                .Where(p => p.Id == slab.RDProductId && p.BrId == branchId)
                .Select(p => p.ProductName)
                .FirstOrDefaultAsync();

            return new CombinedRDIntDTO
            {
                rdInterestSlab = MapSlabToDTO(slab, productName),
                rdInterestSlabDetails = slabDetails.Select(MapDetailToDTO).ToList()
            };
        }

        // ── UPDATE ───────────────────────────────────────────────────────────────

        public async Task<string> ModifyInterestSlabAsync(CombinedRDIntDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dt) =>
                    DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);

                var existingSlab = await _context.rdinterestslab
                    .FirstOrDefaultAsync(s =>
                        s.Id == combinedDto.rdInterestSlab.Id &&
                        s.BranchId == combinedDto.rdInterestSlab.BranchId);

                if (existingSlab == null)
                    return "Interest slab not found.";

                var nameExists = await _context.rdinterestslab
                    .AnyAsync(s =>
                        s.BranchId == combinedDto.rdInterestSlab.BranchId &&
                        s.SlabName == combinedDto.rdInterestSlab.SlabName &&
                        s.Id != combinedDto.rdInterestSlab.Id);

                if (nameExists)
                    return "An interest slab for entered name already exists.";

                // Cross-field slab detail validation
                var detailValidationError = ValidateSlabDetails(combinedDto.rdInterestSlabDetails);
                if (detailValidationError != null)
                    return detailValidationError;

                // Update header
                combinedDto.rdInterestSlab.ApplicableDate =
                    ToUnspecified(combinedDto.rdInterestSlab.ApplicableDate);
                MapToEntity(combinedDto.rdInterestSlab, existingSlab);
                await _context.SaveChangesAsync();

                // Delete old details, then insert fresh ones
                var existingDetails = await _context.rdinterestslabdetail
                    .Where(d => d.RDIntSlabId == existingSlab.Id && d.BranchId == existingSlab.BranchId)
                    .ToListAsync();

                _context.rdinterestslabdetail.RemoveRange(existingDetails);

                foreach (var detailDto in combinedDto.rdInterestSlabDetails)
                {
                    var detail = MapDetailToEntity(detailDto);
                    detail.RDIntSlabId = existingSlab.Id;
                    detail.BranchId = existingSlab.BranchId;
                    await _context.rdinterestslabdetail.AddAsync(detail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyInterestSlabAsync), nameof(RDInterestSlabService));
                return "An error occurred while updating the interest slab.";
            }
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        public async Task<bool> DeleteInterestSlabAsync(int id, int branchId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var slab = await _context.rdinterestslab
                    .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

                if (slab == null) return false;

                _context.rdinterestslab.Remove(slab);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteInterestSlabAsync), nameof(RDInterestSlabService));
                throw;
            }
        }

        // ── Cross-field validation (cannot be done via data annotations) ─────────

        private static string? ValidateSlabDetails(List<RDInterestSlabDetailDTO> details)
        {
            if (details == null || details.Count == 0)
                return "At least one slab detail is required.";

            for (int i = 0; i < details.Count; i++)
            {
                var d = details[i];
                int slab = i + 1;

                if (d.ToAmount <= d.FromAmount)
                    return $"Slab {slab}: To Amount ({d.ToAmount}) must be greater than From Amount ({d.FromAmount}).";

                if (d.PeriodTo <= d.PeriodFrom)
                    return $"Slab {slab}: Period To ({d.PeriodTo}) must be greater than Period From ({d.PeriodFrom}).";

                // Contiguous amount check (slabs must not overlap or leave gaps)
                if (i > 0)
                {
                    var prev = details[i - 1];
                    var expected = prev.ToAmount + 1;
                    if (d.FromAmount != expected)
                        return $"Slab {slab}: From Amount ({d.FromAmount}) must equal previous slab's To Amount + 1 ({expected}).";
                }

                // Validate KistInterval is one of allowed values
                var allowed = new[] { "Monthly", "Quarterly", "HalfYearly", "Yearly" };
                if (!allowed.Contains(d.KistInterval))
                    return $"Slab {slab}: KistInterval '{d.KistInterval}' is invalid. Allowed: {string.Join(", ", allowed)}.";
            }

            return null;
        }

        // ── Mapping Helpers ───────────────────────────────────────────────────────

        // Header: DTO → Entity (create or update)
        private static RDInterestSlab MapToEntity(
            RDInterestSlabDTO dto,
            RDInterestSlab? entity = null)
        {
            entity ??= new RDInterestSlab();

            entity.BranchId = dto.BranchId;
            entity.RDProductId = dto.RDProductId;
            entity.SlabName = dto.SlabName;
            entity.ApplicableDate = dto.ApplicableDate;

            return entity;
        }

        // Header: Entity → DTO
        private static RDInterestSlabDTO MapSlabToDTO(
            RDInterestSlab entity,
            string? productName = null) => new()
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                RDProductId = entity.RDProductId,
                SlabName = entity.SlabName,
                ApplicableDate = entity.ApplicableDate,
            };

        // Detail: DTO → Entity
        private static RDInterestSlabDetail MapDetailToEntity(
            RDInterestSlabDetailDTO dto,
            RDInterestSlabDetail? entity = null)
        {
            entity ??= new RDInterestSlabDetail();

            entity.RDIntSlabId = dto.RDIntSlabId;
            entity.BranchId = dto.BranchId;
            entity.SlabNo = dto.SlabNo;        // NEW
            entity.FromAmount = dto.FromAmount;
            entity.ToAmount = dto.ToAmount;
            entity.KistInterval = dto.KistInterval;  // NEW
            entity.PeriodFrom = dto.PeriodFrom;    // NEW
            entity.PeriodTo = dto.PeriodTo;      // NEW
            entity.InterestRate = dto.InterestRate;

            return entity;
        }

        // Detail: Entity → DTO
        private static RDInterestSlabDetailDTO MapDetailToDTO(
            RDInterestSlabDetail entity) => new()
            {
                Id = entity.Id,
                RDIntSlabId = entity.RDIntSlabId,
                BranchId = entity.BranchId,
                SlabNo = entity.SlabNo,        // NEW
                FromAmount = entity.FromAmount,
                ToAmount = entity.ToAmount,
                KistInterval = entity.KistInterval,  // NEW
                PeriodFrom = entity.PeriodFrom,    // NEW
                PeriodTo = entity.PeriodTo,      // NEW
                InterestRate = entity.InterestRate,
            };
    }
}


