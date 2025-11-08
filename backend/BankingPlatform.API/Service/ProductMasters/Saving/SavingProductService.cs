// BankingPlatform.API.Service.ProductMasters.Savings/SavingsProductService.cs
using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.ProductMasters.Saving;
using BankingPlatform.Infrastructure.Models.ProductMasters.Saving;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.ProductMasters.Savings
{
    public class SavingsProductService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public SavingsProductService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        public async Task<string> CreateProductAsync(CombinedSavingDTO dto)
        {
            // Validation: Check if Product Name already exists
            if (!string.IsNullOrWhiteSpace(dto.SavingsProductDTO!.ProductName))
            {
                if (await _context.savingproduct
                    .Where(x => x.BranchId == dto.SavingsProductDTO!.BranchId &&
                                x.ProductName.ToLower() == dto.SavingsProductDTO!.ProductName.ToLower())
                    .AnyAsync())
                {
                    return "Saving Product Name already exists.";
                }
            }

            // Validation: Check if Product Code already exists
            if (!string.IsNullOrWhiteSpace(dto.SavingsProductDTO!.ProductCode))
            {
                if (await _context.savingproduct
                    .Where(x => x.BranchId == dto.SavingsProductDTO!.BranchId &&
                                x.ProductCode.ToLower() == dto.SavingsProductDTO!.ProductCode.ToLower())
                    .AnyAsync())
                {
                    return "Saving Product Code already exists.";
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Step 1: Add Product
                var productEntity = MapToEntity(dto.SavingsProductDTO!);
                _context.savingproduct.Add(productEntity);
                await _context.SaveChangesAsync(); // Save to get Product ID

                // Step 2: Add Product Rules
                if (dto.SavingsProductRulesDTO != null)
                {
                    var ruleEntity = MapToEntity(dto.SavingsProductRulesDTO, productEntity.Id);
                    _context.savingproductrules.Add(ruleEntity);
                }

                // Step 3: Add Posting Heads
                if (dto.SavingsProductPostingHeadsDTO != null)
                {
                    var postingEntity = MapToEntity(dto.SavingsProductPostingHeadsDTO, productEntity.Id);
                    _context.savingproductpostingheads.Add(postingEntity);
                }

                // Step 4: Add Interest Rules
                if (dto.SavingsProductInterestRulesDTO != null)
                {
                    var interestEntity = MapToEntity(dto.SavingsProductInterestRulesDTO, productEntity.Id);
                    _context.savingproductinterestrules.Add(interestEntity);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateProductAsync), nameof(SavingsProductService));
                throw;
            }
        }

        public async Task<CombinedSavingDTO> ModifyProductAsync(CombinedSavingDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Find existing product
                var product = await _context.savingproduct
                    .FirstOrDefaultAsync(p => p.Id == dto.SavingsProductDTO!.Id &&
                                            p.BranchId == dto.SavingsProductDTO!.BranchId);

                if (product == null)
                    throw new Exception("Saving Product not found.");

                // Validation: Check if Product Name already exists (excluding current product)
                if (!string.IsNullOrWhiteSpace(dto.SavingsProductDTO!.ProductName))
                {
                    if (await _context.savingproduct
                        .Where(x => x.BranchId == dto.SavingsProductDTO!.BranchId &&
                                    x.ProductName.ToLower() == dto.SavingsProductDTO!.ProductName.ToLower() &&
                                    x.Id != dto.SavingsProductDTO!.Id)
                        .AnyAsync())
                    {
                        throw new Exception("Saving Product Name already exists.");
                    }
                }

                // Validation: Check if Product Code already exists (excluding current product)
                if (!string.IsNullOrWhiteSpace(dto.SavingsProductDTO!.ProductCode))
                {
                    if (await _context.savingproduct
                        .Where(x => x.BranchId == dto.SavingsProductDTO!.BranchId &&
                                    x.ProductCode.ToLower() == dto.SavingsProductDTO!.ProductCode.ToLower() &&
                                    x.Id != dto.SavingsProductDTO!.Id)
                        .AnyAsync())
                    {
                        throw new Exception("Saving Product Code already exists.");
                    }
                }

                // Update Product
                product.ProductName = dto.SavingsProductDTO!.ProductName;
                product.ProductCode = dto.SavingsProductDTO!.ProductCode;
                product.EffectiveFrom = dto.SavingsProductDTO!.EffectiveFrom;
                product.EffectiveTill = dto.SavingsProductDTO!.EffectiveTill;
                product.IsNomineeMandatoryInAccMasters = dto.SavingsProductDTO.IsNomineeMandatoryInAccMasters;
                // Update Product Rules
                if (dto.SavingsProductRulesDTO != null)
                {
                    var existingRule = await _context.savingproductrules
                        .FirstOrDefaultAsync(r => r.SavingsProductId == product.Id &&
                                                 r.BranchId == product.BranchId);

                    if (existingRule != null)
                    {
                        existingRule.AcStatementFrequency = dto.SavingsProductRulesDTO.AcStatementFrequency;
                        existingRule.AcRetentionDays = dto.SavingsProductRulesDTO.AcRetentionDays;
                        existingRule.MinBalanceAmt = dto.SavingsProductRulesDTO.MinBalanceAmt;
                        existingRule.ModifiedDate = DateTime.UtcNow;
                    }
                }

                // Update Posting Heads
                if (dto.SavingsProductPostingHeadsDTO != null)
                {
                    var existingPosting = await _context.savingproductpostingheads
                        .FirstOrDefaultAsync(p => p.SavingsProductId == product.Id &&
                                                 p.BranchId == product.BranchId);

                    if (existingPosting != null)
                    {
                        existingPosting.PrincipalBalHeadCode = dto.SavingsProductPostingHeadsDTO.PrincipalBalHeadCode;
                        existingPosting.SuspendedBalHeadCode = dto.SavingsProductPostingHeadsDTO.SuspendedBalHeadCode;
                        existingPosting.IntPayableHeadCode = dto.SavingsProductPostingHeadsDTO.IntPayableHeadCode;
                    }
                }

                // Update Interest Rules
                if (dto.SavingsProductInterestRulesDTO != null)
                {
                    var existingInterest = await _context.savingproductinterestrules
                        .FirstOrDefaultAsync(i => i.SavingsProductId == product.Id &&
                                                 i.BranchId == product.BranchId);

                    if (existingInterest != null)
                    {
                        existingInterest.ApplicableDate = dto.SavingsProductInterestRulesDTO.ApplicableDate;
                        existingInterest.RateAppliedMethod = dto.SavingsProductInterestRulesDTO.RateAppliedMethod;
                        existingInterest.IntApplicableDate = dto.SavingsProductInterestRulesDTO.IntApplicableDate;
                        existingInterest.CalculationMethod = dto.SavingsProductInterestRulesDTO.CalculationMethod;
                        existingInterest.InterestRateMinValue = dto.SavingsProductInterestRulesDTO.InterestRateMinValue;
                        existingInterest.InterestRateMaxValue = dto.SavingsProductInterestRulesDTO.InterestRateMaxValue;
                        existingInterest.InterestVariationMinValue = dto.SavingsProductInterestRulesDTO.InterestVariationMinValue;
                        existingInterest.InterestVariationMaxValue = dto.SavingsProductInterestRulesDTO.InterestVariationMaxValue;
                        existingInterest.MinPostingIntAmt = dto.SavingsProductInterestRulesDTO.MinPostingIntAmt;
                        existingInterest.MinBalForPosting = dto.SavingsProductInterestRulesDTO.MinBalForPosting;
                        existingInterest.IntPostingInterval = dto.SavingsProductInterestRulesDTO.IntPostingInterval;
                        existingInterest.IntPostingDate = dto.SavingsProductInterestRulesDTO.IntPostingDate;
                        existingInterest.CompoundInterval = dto.SavingsProductInterestRulesDTO.CompoundInterval;
                        existingInterest.IntCompoundDate = dto.SavingsProductInterestRulesDTO.IntCompoundDate;
                        existingInterest.ActionOnIntPosting = dto.SavingsProductInterestRulesDTO.ActionOnIntPosting;
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return dto;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyProductAsync), nameof(SavingsProductService));
                throw;
            }
        }

        public async Task<bool> DeleteProductAsync(int productId, int branchId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = await _context.savingproduct
                    .FirstOrDefaultAsync(p => p.Id == productId && p.BranchId == branchId);

                if (product == null)
                    throw new Exception("Saving Product not found.");
                _context.savingproduct.Remove(product);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteProductAsync), nameof(SavingsProductService));
                throw;
            }
        }

        public async Task<CombinedSavingDTO?> GetSavingsProductByIdAsync(int id, int branchId)
        {
            // Step 1: Fetch Savings Product
            var product = await _context.savingproduct
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId);

            if (product == null)
                return null;

            // Step 2: Fetch Product Rules
            var productRules = await _context.savingproductrules
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.SavingsProductId == id && r.BranchId == branchId);

            // Step 3: Fetch Posting Heads
            var postingHeads = await _context.savingproductpostingheads
                .AsNoTracking()
                .FirstOrDefaultAsync(ph => ph.SavingsProductId == id && ph.BranchId == branchId);

            // Step 4: Fetch Interest Rules
            var interestRules = await _context.savingproductinterestrules
                .AsNoTracking()
                .FirstOrDefaultAsync(ir => ir.SavingsProductId == id && ir.BranchId == branchId);

            // Step 5: Map all entities to DTOs
            var savingsProductDTO = MapToDTO(product);
            var savingsProductRulesDTO = productRules != null ? MapToDTO(productRules) : null;
            var savingsProductPostingHeadsDTO = postingHeads != null ? MapToDTO(postingHeads) : null;
            var savingsProductInterestRulesDTO = interestRules != null ? MapToDTO(interestRules) : null;

            // Step 6: Combine everything into a single DTO
            return new CombinedSavingDTO
            {
                SavingsProductDTO = savingsProductDTO,
                SavingsProductRulesDTO = savingsProductRulesDTO,
                SavingsProductPostingHeadsDTO = savingsProductPostingHeadsDTO,
                SavingsProductInterestRulesDTO = savingsProductInterestRulesDTO
            };
        }

        public async Task<(List<CombinedSavingDTO> Items, int TotalCount)> GetAllSavingsProductsAsync(
            int branchId,
            LocationFilterDTO filter)
        {
            try
            {
                // Step 1: Base query for Savings products in the branch
                var query = _context.savingproduct
                    .AsNoTracking()
                    .Where(p => p.BranchId == branchId);

                // Step 2: Apply search filter if provided
                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm.ToLower();

                    // Optional: Search in posting heads table
                    var matchingProductIdsFromPostingHeads = await _context.savingproductpostingheads
                        .AsNoTracking()
                        .Where(ph => ph.BranchId == branchId &&
                                     (ph.SuspendedBalHeadCode.ToString().Contains(term) ||
                                      ph.IntPayableHeadCode.ToString().Contains(term) ||
                                      ph.PrincipalBalHeadCode.ToString().Contains(term)))
                        .Select(ph => ph.SavingsProductId)
                        .ToListAsync();

                    query = query.Where(p =>
                        p.ProductName.ToLower().Contains(term) ||
                        p.ProductCode.ToLower().Contains(term) ||
                        matchingProductIdsFromPostingHeads.Contains(p.Id));
                }

                // Step 3: Total count before pagination
                var totalCount = await query.CountAsync();

                // Step 4: Apply pagination
                var savingsProducts = await query
                    .OrderBy(p => p.ProductName)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .ToListAsync();

                if (!savingsProducts.Any())
                    return (new List<CombinedSavingDTO>(), totalCount);

                var productIds = savingsProducts.Select(p => p.Id).ToList();

                // Step 5: Batch load related tables
                var rulesList = await _context.savingproductrules
                    .AsNoTracking()
                    .Where(r => productIds.Contains(r.SavingsProductId) && r.BranchId == branchId)
                    .ToListAsync();

                var postingHeadsList = await _context.savingproductpostingheads
                    .AsNoTracking()
                    .Where(ph => productIds.Contains(ph.SavingsProductId) && ph.BranchId == branchId)
                    .ToListAsync();

                var interestRulesList = await _context.savingproductinterestrules
                    .AsNoTracking()
                    .Where(ir => productIds.Contains(ir.SavingsProductId) && ir.BranchId == branchId)
                    .ToListAsync();

                // Step 6: Map to DTO
                var combinedList = savingsProducts.Select(product =>
                {
                    var rules = rulesList.FirstOrDefault(r => r.SavingsProductId == product.Id);
                    var postingHeads = postingHeadsList.FirstOrDefault(ph => ph.SavingsProductId == product.Id);
                    var interestRules = interestRulesList.FirstOrDefault(ir => ir.SavingsProductId == product.Id);

                    return new CombinedSavingDTO
                    {
                        SavingsProductDTO = MapToDTO(product),
                        SavingsProductRulesDTO = rules != null ? MapToDTO(rules) : null,
                        SavingsProductPostingHeadsDTO = postingHeads != null ? MapToDTO(postingHeads) : null,
                        SavingsProductInterestRulesDTO = interestRules != null ? MapToDTO(interestRules) : null
                    };
                }).ToList();

                return (combinedList, totalCount);
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllSavingsProductsAsync), nameof(SavingsProductService));
                throw;
            }
        }

        #region DTO Mapping Methods

        // Entity to DTO Mappings
        public SavingsProductDTO MapToDTO(SavingProduct entity)
        {
            return new SavingsProductDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                ProductName = entity.ProductName,
                ProductCode = entity.ProductCode,
                EffectiveFrom = entity.EffectiveFrom,
                EffectiveTill = entity.EffectiveTill,
                IsNomineeMandatoryInAccMasters = entity.IsNomineeMandatoryInAccMasters
            };
        }

        public SavingsProductRulesDTO MapToDTO(SavingsProductRules entity)
        {
            return new SavingsProductRulesDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                SavingsProductId = entity.SavingsProductId,
                AcStatementFrequency = entity.AcStatementFrequency,
                AcRetentionDays = entity.AcRetentionDays,
                MinBalanceAmt = entity.MinBalanceAmt
            };
        }

        public SavingsProductPostingHeadsDTO MapToDTO(SavingsProductPostingHeads entity)
        {
            return new SavingsProductPostingHeadsDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                SavingsProductId = entity.SavingsProductId,
                PrincipalBalHeadCode = entity.PrincipalBalHeadCode,
                SuspendedBalHeadCode = entity.SuspendedBalHeadCode,
                IntPayableHeadCode = entity.IntPayableHeadCode
            };
        }

        public SavingsProductInterestRulesDTO MapToDTO(SavingsProductInterestRules entity)
        {
            return new SavingsProductInterestRulesDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                SavingsProductId = entity.SavingsProductId,
                ApplicableDate = entity.ApplicableDate,
                RateAppliedMethod = entity.RateAppliedMethod,
                IntApplicableDate = entity.IntApplicableDate,
                CalculationMethod = entity.CalculationMethod,
                InterestRateMinValue = entity.InterestRateMinValue,
                InterestRateMaxValue = entity.InterestRateMaxValue,
                InterestVariationMinValue = entity.InterestVariationMinValue,
                InterestVariationMaxValue = entity.InterestVariationMaxValue,
                MinPostingIntAmt = entity.MinPostingIntAmt,
                MinBalForPosting = entity.MinBalForPosting,
                IntPostingInterval = entity.IntPostingInterval,
                IntPostingDate = entity.IntPostingDate,
                CompoundInterval = entity.CompoundInterval,
                IntCompoundDate = entity.IntCompoundDate,
                ActionOnIntPosting = entity.ActionOnIntPosting
            };
        }

        // DTO to Entity Mappings
        public SavingProduct MapToEntity(SavingsProductDTO dto)
        {
            return new SavingProduct
            {
                Id = dto.Id ?? 0,
                BranchId = dto.BranchId,
                ProductName = dto.ProductName,
                ProductCode = dto.ProductCode,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTill = dto.EffectiveTill,
                IsNomineeMandatoryInAccMasters = dto.IsNomineeMandatoryInAccMasters
            };
        }

        public SavingsProductRules MapToEntity(SavingsProductRulesDTO dto, int productId)
        {
            return new SavingsProductRules
            {
                Id = dto.Id ?? 0,
                BranchId = dto.BranchId,
                SavingsProductId = productId,
                AcStatementFrequency = dto.AcStatementFrequency,
                AcRetentionDays = dto.AcRetentionDays,
                MinBalanceAmt = dto.MinBalanceAmt,
                CreatedDate = DateTime.UtcNow
            };
        }

        public SavingsProductPostingHeads MapToEntity(SavingsProductPostingHeadsDTO dto, int productId)
        {
            return new SavingsProductPostingHeads
            {
                Id = dto.Id ?? 0,
                BranchId = dto.BranchId,
                SavingsProductId = productId,
                PrincipalBalHeadCode = dto.PrincipalBalHeadCode,
                SuspendedBalHeadCode = dto.SuspendedBalHeadCode,
                IntPayableHeadCode = dto.IntPayableHeadCode
            };
        }

        public SavingsProductInterestRules MapToEntity(SavingsProductInterestRulesDTO dto, int productId)
        {
            return new SavingsProductInterestRules
            {
                Id = dto.Id ?? 0,
                BranchId = dto.BranchId,
                SavingsProductId = productId,
                ApplicableDate = dto.ApplicableDate,
                RateAppliedMethod = dto.RateAppliedMethod,
                IntApplicableDate = dto.IntApplicableDate,
                CalculationMethod = dto.CalculationMethod,
                InterestRateMinValue = dto.InterestRateMinValue,
                InterestRateMaxValue = dto.InterestRateMaxValue,
                InterestVariationMinValue = dto.InterestVariationMinValue,
                InterestVariationMaxValue = dto.InterestVariationMaxValue,
                MinPostingIntAmt = dto.MinPostingIntAmt,
                MinBalForPosting = dto.MinBalForPosting,
                IntPostingInterval = dto.IntPostingInterval,
                IntPostingDate = dto.IntPostingDate,
                CompoundInterval = dto.CompoundInterval,
                IntCompoundDate = dto.IntCompoundDate,
                ActionOnIntPosting = dto.ActionOnIntPosting,
            };
        }

        #endregion
    }
}
