using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.Saving;
using BankingPlatform.Infrastructure.Models.InterestSlabs.Saving;

namespace BankingPlatform.API.Service.InterestSlabs.Saving
{
    public class SavingInterestSlabService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public SavingInterestSlabService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        // CREATE
        public async Task<string> CreateInterestSlabAsync(CombinedSavingIntDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dateTime) =>
                    DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);

                DateTime applicableDate = ToUnspecified(combinedDto.savingInterestSlab.ApplicableDate);

                // Validate: Check if slab already exists for this product and date
                var existingSlab = await _context.savinginterestslab
                    .FirstOrDefaultAsync(s => s.BranchId == combinedDto.savingInterestSlab.BranchId &&
                                             s.SavingProductId == combinedDto.savingInterestSlab.SavingProductId &&
                                             s.ApplicableDate >= applicableDate);

                if (existingSlab != null)
                {
                    return "An interest slab for this product already exists with an applicable date on or after the selected date. Please use a future date or modify the existing slab.";
                }

                // Create main interest slab record
                combinedDto.savingInterestSlab.ApplicableDate = applicableDate;
                var interestSlab = MapToEntity(combinedDto.savingInterestSlab);
                await _context.savinginterestslab.AddAsync(interestSlab);
                await _context.SaveChangesAsync();

                // Create slab details (individual slab ranges)
                foreach (var slabDetailDto in combinedDto.savingInterestSlabDetails)
                {
                    var slabDetail = MapToEntity(slabDetailDto);
                    slabDetail.savingintslabId = interestSlab.Id;
                    slabDetail.BranchId = interestSlab.BranchId;
                    await _context.savinginterestslabdetail.AddAsync(slabDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateInterestSlabAsync), nameof(SavingInterestSlabService));
                return "An error occurred while creating the interest slab.";
            }
        }

        // READ - Get All with Pagination
        public async Task<(List<CombinedSavingIntDTO> Items, int TotalCount)> GetAllsavingInterestSlabsAsync(
            int branchId,
            LocationFilterDTO filter)
        {
            var query = _context.savinginterestslab
                .AsNoTracking()
                .Where(x => x.BranchId == branchId);

            // Search filter
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();

                // Get matching product names
                var matchingProductIds = await _context.savingproduct
                    .AsNoTracking()
                    .Where(p => p.BranchId == branchId &&
                               p.ProductName.ToLower().Contains(term))
                    .Select(p => p.Id)
                    .ToListAsync();

                query = query.Where(s =>
                    matchingProductIds.Contains(s.SavingProductId) ||
                    s.ApplicableDate.ToString().Contains(term));
            }

            var totalCount = await query.CountAsync();

            var slabs = await query
                .OrderByDescending(s => s.ApplicableDate)
                .ThenBy(s => s.SavingProductId)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            // Get slab IDs for batch loading
            var slabIds = slabs.Select(s => s.Id).ToList();

            // Batch load slab details
            var slabDetails = await _context.savinginterestslabdetail
                .AsNoTracking()
                .Where(d => slabIds.Contains(d.savingintslabId) && d.BranchId == branchId)
                .ToListAsync();

            // Get product names for display
            var productIds = slabs.Select(s => s.SavingProductId).Distinct().ToList();
            var products = await _context.savingproduct
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id) && p.BranchId == branchId)
                .ToDictionaryAsync(p => p.Id, p => p.ProductName);

            var items = slabs.Select(slab =>
            {
                var details = slabDetails
                    .Where(d => d.savingintslabId == slab.Id)
                    .ToList();

                return new CombinedSavingIntDTO
                {
                    savingInterestSlab = MapToDTO(slab, products.GetValueOrDefault(slab.SavingProductId)),
                    savingInterestSlabDetails = details.Select(MapToDTO).ToList()
                };
            }).ToList();

            return (items, totalCount);
        }

        // READ - Get by ID
        public async Task<CombinedSavingIntDTO?> GetsavingInterestSlabByIdAsync(int id, int branchId)
        {
            var slab = await _context.savinginterestslab
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (slab == null) return null;

            var slabDetails = await _context.savinginterestslabdetail
                .AsNoTracking()
                .Where(d => d.savingintslabId == id && d.BranchId == branchId)
                .ToListAsync();

            var product = await _context.savingproduct
                .AsNoTracking()
                .Where(p => p.Id == slab.SavingProductId && p.BranchId == branchId)
                .Select(p => p.ProductName)
                .FirstOrDefaultAsync();

            return new CombinedSavingIntDTO
            {
                savingInterestSlab = MapToDTO(slab, product),
                savingInterestSlabDetails = slabDetails.Select(MapToDTO).ToList()
            };
        }

        // UPDATE
        public async Task<string> ModifyInterestSlabAsync(CombinedSavingIntDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dateTime) =>
                    DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);

                var existingSlab = await _context.savinginterestslab
                    .FirstOrDefaultAsync(s => s.Id == combinedDto.savingInterestSlab.Id &&
                                             s.BranchId == combinedDto.savingInterestSlab.BranchId);

                if (existingSlab == null)
                {
                    return "Interest slab not found.";
                }

                // Update main slab record
                combinedDto.savingInterestSlab.ApplicableDate = ToUnspecified(combinedDto.savingInterestSlab.ApplicableDate);
                MapToEntity(combinedDto.savingInterestSlab, existingSlab);
                await _context.SaveChangesAsync();

                // Delete existing slab details
                var existingDetails = await _context.savinginterestslabdetail
                    .Where(d => d.savingintslabId == existingSlab.Id && d.BranchId == existingSlab.BranchId)
                    .ToListAsync();

                _context.savinginterestslabdetail.RemoveRange(existingDetails);

                // Add updated slab details
                foreach (var slabDetailDto in combinedDto.savingInterestSlabDetails)
                {
                    var slabDetail = MapToEntity(slabDetailDto);
                    slabDetail.savingintslabId = existingSlab.Id;
                    slabDetail.BranchId = existingSlab.BranchId;
                    await _context.savinginterestslabdetail.AddAsync(slabDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyInterestSlabAsync), nameof(SavingInterestSlabService));
                return "An error occurred while updating the interest slab.";
            }
        }

        // DELETE
        public async Task<bool> DeleteInterestSlabAsync(int id, int branchId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var slabToDelete = await _context.savinginterestslab
                    .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

                if (slabToDelete == null)
                {
                    return false;
                }

                // Delete slab details
                var slabDetails = await _context.savinginterestslabdetail
                    .Where(d => d.savingintslabId == id && d.BranchId == branchId)
                    .ToListAsync();

                _context.savinginterestslabdetail.RemoveRange(slabDetails);

                // Delete main slab
                _context.savinginterestslab.Remove(slabToDelete);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteInterestSlabAsync), nameof(SavingInterestSlabService));
                throw;
            }
        }

        // ---------------- Mapping Helpers ----------------

        private SavingInterestSlab MapToEntity(SavingInterestSlabDTO dto, SavingInterestSlab? entity = null)
        {
            entity ??= new SavingInterestSlab();

            entity.BranchId = dto.BranchId;
            entity.SavingProductId = dto.SavingProductId;
            entity.ApplicableDate = dto.ApplicableDate;
            entity.SlabName = dto.SlabName;

            return entity;
        }

        private SavingInterestSlabDTO MapToDTO(SavingInterestSlab entity, string? productName = null) => new()
        {
            Id = entity.Id,
            BranchId = entity.BranchId,
            SavingProductId = entity.SavingProductId,
            ApplicableDate = entity.ApplicableDate,
            SlabName = entity.SlabName
        };

        private SavingInterestSlabDetail MapToEntity(SavingInterestSlabDetailDTO dto, SavingInterestSlabDetail? entity = null)
        {
            entity ??= new SavingInterestSlabDetail();

            entity.savingintslabId = dto.SavingIntSlabId;
            entity.BranchId = dto.BranchId;
            entity.fromamount = dto.FromAmount;
            entity.toamount = dto.ToAmount;
            entity.interestrate = dto.InterestRate;

            return entity;
        }

        private SavingInterestSlabDetailDTO MapToDTO(SavingInterestSlabDetail entity) => new()
        {
            Id = entity.Id,
            SavingIntSlabId = entity.savingintslabId,
            BranchId = entity.BranchId,
            FromAmount = entity.fromamount,
            ToAmount = entity.toamount,
            InterestRate = entity.interestrate
        };
    }
}

