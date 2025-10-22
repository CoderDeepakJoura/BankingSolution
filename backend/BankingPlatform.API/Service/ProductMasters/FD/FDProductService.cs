using BankingPlatform.API.Common;
using BankingPlatform.API.Controllers.Member;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Member;
using BankingPlatform.API.DTO.ProductMasters.FD;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.Infrastructure.Configurations.ProductMasters.FD;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.ProductMasters.FD;
using BankingPlatform.Infrastructure.Models.voucher;

namespace BankingPlatform.API.Service.ProductMasters.FD
{
    public class FDProductService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        public FDProductService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        public async Task<string> CreateProductAsync(CombinedFDDTO dto)
        {
            if(dto.fdProductDTO!.ProductName.Trim() != "")
            {
                if (await _context.fdproduct.Where(x => x.BranchId == dto.fdProductDTO!.BranchId && x.ProductName.ToLower() == dto.fdProductDTO!.ProductName.ToLower()).AnyAsync())
                    return "FD Product Name already Exists.";
            }
            if (dto.fdProductDTO!.ProductCode.Trim() != "")
            {
                if (await _context.fdproduct.Where(x => x.BranchId == dto.fdProductDTO!.BranchId && x.ProductCode.ToLower() == dto.fdProductDTO!.ProductCode.ToLower()).AnyAsync())
                    return "FD Product Code already Exists.";
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var productEntity = MapToEntity(dto.fdProductDTO!);
                _context.fdproduct.Add(productEntity);
                await _context.SaveChangesAsync(); // to get Product ID

                if (dto.fdProductRulesDTO != null)
                {
                    var ruleEntity = MapToEntity(dto.fdProductRulesDTO, productEntity.Id);
                    _context.fdproductrules.Add(ruleEntity);
                }

                // Step 3: Add Posting Heads
                if (dto.fdProductPostingHeadsDTO != null)
                {
                    var postingEntity = MapToEntity(dto.fdProductPostingHeadsDTO, productEntity.Id);
                    _context.fdproductpostingheads.Add(postingEntity);
                }

                // Step 4: Add Interest Rules
                if (dto.fdProductInterestRulesDTO != null)
                {
                    var interestEntity = MapToEntity(dto.fdProductInterestRulesDTO, productEntity.Id);
                    _context.fdproductinterestrules.Add(interestEntity);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateProductAsync), nameof(FDProductService));
                throw;
            }
            return "success";
        }

        public async Task<CombinedFDDTO> ModifyProductAsync(CombinedFDDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = await _context.fdproduct
                    .FirstOrDefaultAsync(p => p.Id == dto.fdProductDTO!.Id && p.BranchId == dto.fdProductDTO!.BranchId);

                if (product == null)
                    throw new Exception("Product not found.");

                if (dto.fdProductDTO!.ProductName.Trim() != "")
                {
                    if (await _context.fdproduct.Where(x => x.BranchId == dto.fdProductDTO!.BranchId && x.ProductName.ToLower() == dto.fdProductDTO!.ProductName.ToLower() && x.Id != dto.fdProductRulesDTO!.Id).AnyAsync())
                        throw new Exception("FD Product Name already Exists.");
                }
                if (dto.fdProductDTO!.ProductCode.Trim() != "")
                {
                    if (await _context.fdproduct.Where(x => x.BranchId == dto.fdProductDTO!.BranchId && x.ProductCode.ToLower() == dto.fdProductDTO!.ProductCode.ToLower() && x.Id != dto.fdProductRulesDTO!.Id).AnyAsync())
                        throw new Exception("FD Product Code already Exists.");
                }

                product.ProductName = dto.fdProductDTO!.ProductName;
                product.ProductCode = dto.fdProductDTO!.ProductCode;
                product.EffectiveFrom = dto.fdProductDTO!.EffectiveFrom;
                product.EffectiveTill = dto.fdProductDTO!.EffectiveTill;
                product.IsSeparateFdAccountAllowed = dto.fdProductDTO!.IsSeparateFdAccountAllowed;

                if (dto.fdProductRulesDTO != null)
                {
                    var existingRule = await _context.fdproductrules
                        .FirstOrDefaultAsync(r => r.ProductId == product.Id && r.BranchId == product.BranchId);

                    if (existingRule != null)
                    {
                        existingRule.IntAccountType = dto.fdProductRulesDTO.IntAccountType;
                        existingRule.FdMaturityReminderInMonths = dto.fdProductRulesDTO.FdMaturityReminderInMonths;
                        existingRule.FdMaturityReminderInDays = dto.fdProductRulesDTO.FdMaturityReminderInDays;
                    }
                }

                if (dto.fdProductPostingHeadsDTO != null)
                {
                    var existingPosting = await _context.fdproductpostingheads
                        .FirstOrDefaultAsync(p => p.ProductId == product.Id && p.BranchId == product.BranchId);

                    if (existingPosting != null)
                    {
                        existingPosting.PrincipalBalHeadCode = dto.fdProductPostingHeadsDTO.PrincipalBalHeadCode;
                        existingPosting.SuspendedBalHeadCode = dto.fdProductPostingHeadsDTO.SuspendedBalHeadCode;
                        existingPosting.IntPayableHeadCode = dto.fdProductPostingHeadsDTO.IntPayableHeadCode;
                    }
                }

                if (dto.fdProductInterestRulesDTO != null)
                {
                    var existingInterest = await _context.fdproductinterestrules
                        .FirstOrDefaultAsync(i => i.ProductId == product.Id && i.BranchId == product.BranchId);

                    if (existingInterest != null)
                    {
                        existingInterest.ApplicableDate = dto.fdProductInterestRulesDTO.ApplicableDate;
                        existingInterest.InterestApplicableOn = dto.fdProductInterestRulesDTO.InterestApplicableOn;
                        existingInterest.InterestRateMinValue = dto.fdProductInterestRulesDTO.InterestRateMinValue;
                        existingInterest.InterestRateMaxValue = dto.fdProductInterestRulesDTO.InterestRateMaxValue;
                        existingInterest.InterestVariationMinValue = dto.fdProductInterestRulesDTO.InterestVariationMinValue;
                        existingInterest.InterestVariationMaxValue = dto.fdProductInterestRulesDTO.InterestVariationMaxValue;
                        existingInterest.ActionOnIntPosting = dto.fdProductInterestRulesDTO.ActionOnIntPosting;
                        existingInterest.PostMaturityIntRateCalculationType = dto.fdProductInterestRulesDTO.PostMaturityIntRateCalculationType;
                        existingInterest.PrematurityCalculationType = dto.fdProductInterestRulesDTO.PrematurityCalculationType;
                        existingInterest.MaturityDueNoticeInDays = dto.fdProductInterestRulesDTO.MaturityDueNoticeInDays;
                        existingInterest.IntPostingInterval = dto.fdProductInterestRulesDTO.IntPostingInterval;
                        existingInterest.IntPostingDate = dto.fdProductInterestRulesDTO.IntPostingDate;
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return dto;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyProductAsync), nameof(FDProductService));
                throw;
            }
        }

        public async Task<bool> DeleteProductAsync(int productId, int branchId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = await _context.fdproduct
                    .FirstOrDefaultAsync(p => p.Id == productId && p.BranchId == branchId);

                if (product == null)
                    throw new Exception("Product not found.");

                var rules = _context.fdproductrules.Where(r => r.ProductId == productId && r.BranchId == branchId);
                var postings = _context.fdproductpostingheads.Where(p => p.ProductId == productId && p.BranchId == branchId);
                var interestRules = _context.fdproductinterestrules.Where(i => i.ProductId == productId && i.BranchId == branchId);

                _context.fdproductrules.RemoveRange(rules);
                _context.fdproductpostingheads.RemoveRange(postings);
                _context.fdproductinterestrules.RemoveRange(interestRules);
                _context.fdproduct.Remove(product);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteProductAsync), nameof(FDProductService));
                throw;
            }
        }

        public async Task<CombinedFDDTO?> GetFDProductByIdAsync(int id, int branchId)
        {
            // Step 1: Fetch FD Product
            var product = await _context.fdproduct
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id && p.BranchId == branchId);

            if (product == null)
                return null;

            var productRules = await _context.fdproductrules
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ProductId == id && r.BranchId == branchId);

            // Step 3: Fetch Posting Heads
            var postingHeads = await _context.fdproductpostingheads
                .AsNoTracking()
                .FirstOrDefaultAsync(ph => ph.ProductId == id && ph.BranchId == branchId);

            // Step 4: Fetch Interest Rules
            var interestRules = await _context.fdproductinterestrules
                .AsNoTracking()
                .FirstOrDefaultAsync(ir => ir.ProductId == id && ir.BranchId == branchId);

            // Step 5: Map all entities to DTOs
            var fdProductDTO = MapToDTO(product);
            var fdProductRulesDTO = MapToDTO(productRules!);
            var fdProductPostingHeadsDTO = MapToDTO(postingHeads!);
            var fdProductInterestRulesDTO = MapToDTO(interestRules!);

            // Step 6: Combine everything into a single DTO
            return new CombinedFDDTO
            {
                fdProductDTO = fdProductDTO,
                fdProductRulesDTO = fdProductRulesDTO,
                fdProductPostingHeadsDTO = fdProductPostingHeadsDTO,
                fdProductInterestRulesDTO = fdProductInterestRulesDTO
            };
        }

        public async Task<(List<CombinedFDDTO> Items, int TotalCount)> GetAllFDProductsAsync(int branchId, LocationFilterDTO filter)
        {
            try
            {
                // Step 1: Base query for FD products in the branch
                var query = _context.fdproduct
                    .AsNoTracking()
                    .Where(p => p.BranchId == branchId);

                // Step 2: Apply search filter if provided
                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm.ToLower();
                    // Optional: Search in posting heads table
                    var matchingProductIdsFromPostingHeads = await _context.fdproductpostingheads
                        .AsNoTracking()
                        .Where(ph => ph.BranchId == branchId &&
                                     (ph.SuspendedBalHeadCode.ToString().Contains(term)
                                     || ph.IntPayableHeadCode.ToString().Contains(term)
                                     || ph.PrincipalBalHeadCode.ToString().Contains(term)
                                     ))
                        .Select(ph => ph.ProductId)
                        .ToListAsync();

                    query = query.Where(p =>
                        p.ProductName.ToLower().Contains(term) ||
                        p.ProductCode.ToLower().Contains(term));
                }

                // Step 3: Total count before pagination
                var totalCount = await query.CountAsync();

                // Step 4: Apply pagination
                var fdProducts = await query
                    .OrderBy(p => p.ProductName)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .ToListAsync();

                if (!fdProducts.Any())
                    return (new List<CombinedFDDTO>(), totalCount);

                var productIds = fdProducts.Select(p => p.Id).ToList();

                // Step 5: Batch load related tables
                var rulesList = await _context.fdproductrules
                    .AsNoTracking()
                    .Where(r => productIds.Contains(r.ProductId) && r.BranchId == branchId)
                    .ToListAsync();

                var postingHeadsList = await _context.fdproductpostingheads
                    .AsNoTracking()
                    .Where(ph => productIds.Contains(ph.ProductId) && ph.BranchId == branchId)
                    .ToListAsync();

                var interestRulesList = await _context.fdproductinterestrules
                    .AsNoTracking()
                    .Where(ir => productIds.Contains(ir.ProductId) && ir.BranchId == branchId)
                    .ToListAsync();

                // Step 6: Map to DTO
                var combinedList = fdProducts.Select(product =>
                {
                    var rules = rulesList.FirstOrDefault(r => r.ProductId == product.Id);
                    var postingHeads = postingHeadsList.FirstOrDefault(ph => ph.ProductId == product.Id);
                    var interestRules = interestRulesList.FirstOrDefault(ir => ir.ProductId == product.Id);

                    return new CombinedFDDTO
                    {
                        fdProductDTO = MapToDTO(product),
                        fdProductRulesDTO = rules != null ? MapToDTO(rules) : null,
                        fdProductPostingHeadsDTO = postingHeads != null ? MapToDTO(postingHeads) : null,
                        fdProductInterestRulesDTO = interestRules != null ? MapToDTO(interestRules) : null
                    };
                }).ToList();

                return (combinedList, totalCount);
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllFDProductsAsync), nameof(FDProductService));
                throw;
            }
        }



        public FdProductDTO MapToDTO(FDProduct entity)
        {
            return new FdProductDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                ProductName = entity.ProductName,
                ProductCode = entity.ProductCode,
                EffectiveFrom = entity.EffectiveFrom,
                EffectiveTill = entity.EffectiveTill,
                IsSeparateFdAccountAllowed = entity.IsSeparateFdAccountAllowed
            };
        }

        public FdProductRulesDTO MapToDTO(FDProductRules entity)
        {
            return new FdProductRulesDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                IntAccountType = entity.IntAccountType,
                FdMaturityReminderInMonths = entity.FdMaturityReminderInMonths,
                FdMaturityReminderInDays = entity.FdMaturityReminderInDays
            };
        }

        public FdProductPostingHeadsDTO MapToDTO(FDProductPostingHeads entity)
        {
            return new FdProductPostingHeadsDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                PrincipalBalHeadCode = entity.PrincipalBalHeadCode,
                SuspendedBalHeadCode = entity.SuspendedBalHeadCode,
                IntPayableHeadCode = entity.IntPayableHeadCode
            };
        }

        public FdProductInterestRulesDTO MapToDTO(FDProductInterestRules entity)
        {
            return new FdProductInterestRulesDTO
            {
                Id = entity.Id,
                BranchId = entity.BranchId,
                ApplicableDate = entity.ApplicableDate,
                InterestApplicableOn = entity.InterestApplicableOn,
                InterestRateMinValue = entity.InterestRateMinValue,
                InterestRateMaxValue = entity.InterestRateMaxValue,
                InterestVariationMinValue = entity.InterestVariationMinValue,
                InterestVariationMaxValue = entity.InterestVariationMaxValue,
                ActionOnIntPosting = entity.ActionOnIntPosting,
                PostMaturityIntRateCalculationType = entity.PostMaturityIntRateCalculationType,
                PrematurityCalculationType = entity.PrematurityCalculationType,
                MaturityDueNoticeInDays = entity.MaturityDueNoticeInDays,
                IntPostingInterval = entity.IntPostingInterval,
                IntPostingDate = entity.IntPostingDate
            };
        }


        public FDProduct MapToEntity(FdProductDTO dto)
        {
            return new FDProduct
            {
                Id = dto.Id,
                BranchId = dto.BranchId,
                ProductName = dto.ProductName,
                ProductCode = dto.ProductCode,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTill = dto.EffectiveTill,
                IsSeparateFdAccountAllowed = dto.IsSeparateFdAccountAllowed
            };
        }

        public FDProductRules MapToEntity(FdProductRulesDTO dto, int productId)
        {
            return new FDProductRules
            {
                Id = dto.Id,
                BranchId = dto.BranchId,
                ProductId = productId,
                IntAccountType = dto.IntAccountType,
                FdMaturityReminderInMonths = dto.FdMaturityReminderInMonths,
                FdMaturityReminderInDays = dto.FdMaturityReminderInDays
            };
        }

        public FDProductPostingHeads MapToEntity(FdProductPostingHeadsDTO dto, int productId)
        {
            return new FDProductPostingHeads
            {
                Id = dto.Id,
                BranchId = dto.BranchId,
                ProductId = productId,
                PrincipalBalHeadCode = dto.PrincipalBalHeadCode,
                SuspendedBalHeadCode = dto.SuspendedBalHeadCode,
                IntPayableHeadCode = dto.IntPayableHeadCode
            };
        }

        public FDProductInterestRules MapToEntity(FdProductInterestRulesDTO dto, int productId)
        {
            return new FDProductInterestRules
            {
                Id = dto.Id,
                BranchId = dto.BranchId,
                ProductId = productId,
                ApplicableDate = dto.ApplicableDate,
                InterestApplicableOn = dto.InterestApplicableOn,
                InterestRateMinValue = dto.InterestRateMinValue,
                InterestRateMaxValue = dto.InterestRateMaxValue,
                InterestVariationMinValue = dto.InterestVariationMinValue,
                InterestVariationMaxValue = dto.InterestVariationMaxValue,
                ActionOnIntPosting = dto.ActionOnIntPosting,
                PostMaturityIntRateCalculationType = dto.PostMaturityIntRateCalculationType,
                PrematurityCalculationType = dto.PrematurityCalculationType,
                MaturityDueNoticeInDays = dto.MaturityDueNoticeInDays,
                IntPostingInterval = dto.IntPostingInterval,
                IntPostingDate = dto.IntPostingDate
            };
        }
    }
}
