using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.InterestSlabs.FD;
using BankingPlatform.API.Service.InterestSlabs.FD;
using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Slabs.FD
{
    public class FDSlabService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public FDSlabService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }
        public async Task<string> CreateInterestSlabAsync(CombinedFDIntDTO combinedDto)
        {
            var slabNameExists = await _context.fdinterestslab.FirstOrDefaultAsync(x => x.SlabName == combinedDto.FDInterestSlab!.SlabName && x.BranchId == combinedDto.FDInterestSlab.BranchId);
            if (slabNameExists != null)
                return "An entry with the same slab name already exists.";
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var interestSlab = MapToEntity(combinedDto.FDInterestSlab!);
                await _context.fdinterestslab.AddAsync(interestSlab);
                await _context.SaveChangesAsync();
                
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateInterestSlabAsync), nameof(FDSlabService));
                return "An error occurred while creating the interest slab.";
            }
        }

        // READ - Get All with Pagination
        public async Task<(List<CombinedFDIntDTO> Items, int TotalCount)> GetAllFDInterestSlabsAsync(
            int branchId,
            LocationFilterDTO filter)
        {
            var query = _context.fdinterestslab
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
                    matchingProductIds.Contains(s.FDProductId)
                    || s.SlabName.Contains(term));
            }

            var totalCount = await query.AnyAsync() ? await query.CountAsync() : 0;

            var slabs = await query
                .OrderBy(s => s.SlabName)
                .ThenBy(s => s.FDProductId)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            // Get slab IDs for batch loading
            var slabIds = slabs.Select(s => s.Id).ToList();

            // Get product names for display
            var productIds = slabs.Select(s => s.FDProductId).Distinct().ToList();
            var products = await _context.fdproduct
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id) && p.BranchId == branchId)
                .ToDictionaryAsync(p => p.Id, p => p.ProductName);

            var items = slabs.Select(slab =>
            {
                return new CombinedFDIntDTO
                {
                    FDInterestSlab = MapToDTO(slab, products.GetValueOrDefault(slab.FDProductId)),
                    FDInterestSlabDetails = new()
                };
            }).ToList();

            return (items, totalCount);
        }

        // READ - Get by ID
        public async Task<CombinedFDIntDTO?> GetFDInterestSlabByIdAsync(int id, int branchId)
        {
            var slab = await _context.fdinterestslab
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

            if (slab == null) return null;


            var product = await _context.fdproduct
                .AsNoTracking()
                .Where(p => p.Id == slab.FDProductId && p.BranchId == branchId)
                .Select(p => p.ProductName)
                .FirstOrDefaultAsync();

            return new CombinedFDIntDTO
            {
                FDInterestSlab = MapToDTO(slab, product),
                FDInterestSlabDetails = new()
            };
        }

        // UPDATE
        public async Task<string> ModifyInterestSlabAsync(CombinedFDIntDTO combinedDto)
        {
            var slabNameExists = await _context.fdinterestslab.FirstOrDefaultAsync(x => x.SlabName == combinedDto.FDInterestSlab!.SlabName && x.BranchId == combinedDto.FDInterestSlab.BranchId && x.Id != combinedDto.FDInterestSlab.Id);
            if (slabNameExists != null)
                return "An entry with the same slab name already exists.";
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var existingSlab = await _context.fdinterestslab
                    .FirstOrDefaultAsync(s => s.Id == combinedDto.FDInterestSlab!.Id &&
                                             s.BranchId == combinedDto.FDInterestSlab.BranchId);

                if (existingSlab == null)
                {
                    return "Interest slab not found.";
                }

                MapToEntity(combinedDto.FDInterestSlab!, existingSlab);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyInterestSlabAsync), nameof(FDSlabService));
                return "An error occurred while updating the interest slab.";
            }
        }

        // DELETE
        public async Task<bool> DeleteInterestSlabAsync(int id, int branchId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var slabToDelete = await _context.fdinterestslab
                    .FirstOrDefaultAsync(s => s.Id == id && s.BranchId == branchId);

                if (slabToDelete == null)
                {
                    return false;
                }
                // Delete main slab
                _context.fdinterestslab.Remove(slabToDelete);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteInterestSlabAsync), nameof(FDSlabService));
                throw;
            }
        }

        // ---------------- Mapping Helpers ----------------

        private FDInterestSlab MapToEntity(FDInterestSlabDTO dto, FDInterestSlab? entity = null)
        {
            entity ??= new FDInterestSlab();

            entity.BranchId = dto.BranchId;
            entity.FDProductId = dto.FDProductId;
            entity.SlabName = dto.SlabName;
            entity.FromDays = dto.FromDays;
            entity.ToDays = dto.ToDays;
            entity.CompoundingInterval = dto.CompoundingInterval;

            return entity;
        }

        private FDInterestSlabDTO MapToDTO(FDInterestSlab entity, string? productName = null) => new()
        {
            Id = entity.Id,
            BranchId = entity.BranchId,
            FDProductId = entity.FDProductId,
            SlabName = entity.SlabName,
            FromDays = entity.FromDays,
            ToDays = entity.ToDays,
            CompoundingInterval = entity.CompoundingInterval,
            ProductName = _commonfunctions.GetFDProductNameFromID(entity.FDProductId, entity.BranchId)
        };
    }
}

