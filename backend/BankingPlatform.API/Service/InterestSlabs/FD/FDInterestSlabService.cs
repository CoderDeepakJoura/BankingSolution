using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.FD;
using BankingPlatform.API.Service.InterestSlabs.FD;
using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;

namespace BankingPlatform.API.Service.InterestSlabs.FD
{
    public class FDInterestSlabService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public FDInterestSlabService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        // CREATE
        public async Task<string> CreateInterestSlabAsync(CombinedFDIntInfoDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dateTime) =>
                    DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);

                var interestSlab = MapToEntity(combinedDto.FDInterestSlabInfo!);
                await _context.fdinterestslabinfo.AddAsync(interestSlab);
                await _context.SaveChangesAsync();

                // Create slab details (individual slab ranges)
                foreach (var slabDetailDto in combinedDto.FDInterestSlabDetails)
                {
                    var slabDetail = MapToEntity(slabDetailDto);
                    slabDetail.FDIntSlabInfoId = interestSlab.Id; // ✅ Correct field
                    slabDetail.BranchId = interestSlab.BranchId;
                    await _context.fdinterestslabdetail.AddAsync(slabDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateInterestSlabAsync), nameof(FDInterestSlabService));
                return "An error occurred while creating the interest slab.";
            }
        }

        // READ - Get All with Pagination
        public async Task<(List<CombinedFDIntInfoDTO> Items, int TotalCount)> GetAllFDInterestSlabsAsync(
            int branchId,
            LocationFilterDTO filter)
        {
            var query = _context.fdinterestslabinfo
                .AsNoTracking()
                .Where(x => x.BranchId == branchId);

            // Search filter
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();

                // Get matching product names
                var matchingProductIds = await _context.fdproduct
                    .AsNoTracking()
                    .Where(p => p.BranchId == branchId &&
                               p.ProductName.ToLower().Contains(term))
                    .Select(p => p.Id)
                    .ToListAsync();

                query = query.Where(s =>
                    matchingProductIds.Contains(s.FDProductId));
            }

            var totalCount = await query.AnyAsync() ? await query.CountAsync() : 0;

            var slabs = await query
                .OrderByDescending(s => s.ApplicableDate)
                .ThenBy(s => s.FDProductId)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            // Get slab IDs for batch loading
            var slabIds = slabs.Select(s => s.Id).ToList();

            // Batch load slab details - ✅ Fixed field name
            var slabDetails = await _context.fdinterestslabdetail
                .AsNoTracking()
                .Where(d => slabIds.Contains(d.FDIntSlabInfoId) && d.BranchId == branchId)
                .ToListAsync();

            // Get product names for display
            var productIds = slabs.Select(s => s.FDProductId).Distinct().ToList();
            var products = await _context.fdproduct
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id) && p.BranchId == branchId)
                .ToDictionaryAsync(p => p.Id, p => p.ProductName);

            var items = slabs.Select(slab =>
            {
                var details = slabDetails
                    .Where(d => d.FDIntSlabInfoId == slab.Id)
                    .Select(MapToDTO) // ✅ No product name needed
                    .ToList();

                return new CombinedFDIntInfoDTO
                {
                    FDInterestSlabInfo = MapToDTO(slab, products.GetValueOrDefault(slab.FDProductId)),
                    FDInterestSlabDetails = details
                };
            }).ToList();

            return (items, totalCount);
        }

        // READ - Get by ID
        public async Task<CombinedFDIntInfoDTO?> GetFDInterestSlabByIdAsync(int id, int branchId)
        {
            var slabInfo = await _context.fdinterestslabinfo
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (slabInfo == null) return null;

            // ✅ Fixed field name
            var slabDetails = await _context.fdinterestslabdetail
                .AsNoTracking()
                .Where(d => d.FDIntSlabInfoId == id && d.BranchId == branchId)
                .ToListAsync();

            var product = await _context.fdproduct
                .AsNoTracking()
                .Where(p => p.Id == slabInfo!.FDProductId && p.BranchId == branchId)
                .Select(p => p.ProductName)
                .FirstOrDefaultAsync();

            return new CombinedFDIntInfoDTO
            {
                FDInterestSlabInfo = MapToDTO(slabInfo!, product),
                FDInterestSlabDetails = slabDetails.Select(MapToDTO).ToList()
            };
        }

        // UPDATE
        public async Task<string> ModifyInterestSlabAsync(CombinedFDIntInfoDTO combinedDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dateTime) =>
                    DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);

                var existingSlab = await _context.fdinterestslabinfo
                    .FirstOrDefaultAsync(s => s.Id == combinedDto.FDInterestSlabInfo!.Id &&
                                             s.BranchId == combinedDto.FDInterestSlabInfo.BranchId);

                if (existingSlab == null)
                {
                    return "Interest slab Detail not found.";
                }

                MapToEntity(combinedDto.FDInterestSlabInfo!, existingSlab);
                await _context.SaveChangesAsync();

                // Delete existing slab details - ✅ Fixed field name
                var existingDetails = await _context.fdinterestslabdetail
                    .Where(d => d.FDIntSlabInfoId == existingSlab.Id && d.BranchId == existingSlab.BranchId)
                    .ToListAsync();

                _context.fdinterestslabdetail.RemoveRange(existingDetails);

                // Add updated slab details
                foreach (var slabDetailDto in combinedDto.FDInterestSlabDetails)
                {
                    var slabDetail = MapToEntity(slabDetailDto);
                    slabDetail.FDIntSlabInfoId = existingSlab.Id; // ✅ Correct field
                    slabDetail.BranchId = existingSlab.BranchId;
                    await _context.fdinterestslabdetail.AddAsync(slabDetail);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyInterestSlabAsync), nameof(FDInterestSlabService));
                return "An error occurred while updating the interest slab.";
            }
        }

        // DELETE
        public async Task<bool> DeleteInterestSlabAsync(int id, int branchId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // ✅ Fixed table name
                var slabToDelete = await _context.fdinterestslabinfo
                    .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

                if (slabToDelete == null)
                {
                    return false;
                }
                var slabdetail = await _context.fdinterestslabdetail.Where(x => x.BranchId == branchId && x.FDIntSlabInfoId == id).ToListAsync();
                _context.fdinterestslabdetail.RemoveRange(slabdetail);

                // Delete main slab (cascade will delete details)
                _context.fdinterestslabinfo.Remove(slabToDelete);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteInterestSlabAsync), nameof(FDInterestSlabService));
                throw;
            }
        }

        // ---------------- Mapping Helpers ----------------

        private FDInterestSlabInfo MapToEntity(FDInterestSlabInfoDTO dto, FDInterestSlabInfo? entity = null)
        {
            entity ??= new FDInterestSlabInfo();

            entity.BranchId = dto.BranchId;
            entity.FDProductId = dto.FDProductId;
            entity.ApplicableDate = dto.ApplicableDate;

            return entity;
        }

        private FDInterestSlabInfoDTO MapToDTO(FDInterestSlabInfo entity, string? productName = null) => new()
        {
            Id = entity.Id,
            BranchId = entity.BranchId,
            FDProductId = entity.FDProductId,
            ApplicableDate = entity.ApplicableDate,
            ProductName = _commonfunctions.GetFDProductNameFromID(entity.FDProductId, entity.BranchId) // ✅ Updated property name
        };

        private FDInterestSlabDetail MapToEntity(FDInterestSlabDetailDTO dto, FDInterestSlabDetail? entity = null)
        {
            entity ??= new FDInterestSlabDetail();

            entity.FDIntSlabInfoId = dto.FDIntSlabInfoId; // ✅ Correct field name
            entity.BranchId = dto.BranchId;
            entity.AgeFrom = dto.AgeFrom;
            entity.AgeTo = dto.AgeTo;
            entity.InterestRate = dto.InterestRate;
            entity.FDIntSlabId = dto.FDIntSlabId;

            return entity;
        }

        private FDInterestSlabDetailDTO MapToDTO(FDInterestSlabDetail entity) => new()
        {
            Id = entity.Id,
            FDIntSlabInfoId = entity.FDIntSlabInfoId, // ✅ Correct field name
            BranchId = entity.BranchId,
            AgeFrom = entity.AgeFrom,
            AgeTo = entity.AgeTo,
            InterestRate = entity.InterestRate,
            FDIntSlabId = entity.FDIntSlabId
        };
    }
}
