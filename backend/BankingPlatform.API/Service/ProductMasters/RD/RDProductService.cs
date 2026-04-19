using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.ProductMasters.RD;
using BankingPlatform.API.Service.ProductMasters.RD;
using BankingPlatform.Infrastructure.Models.ProductMasters.RD;

namespace BankingPlatform.API.Service.ProductMasters.RD
{
    public class RDProductService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public RDProductService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        // ─── CREATE ───────────────────────────────────────────────────────────────
        public async Task<string> CreateProductAsync(CombinedRDProductDTO dto)
        {
            if (dto.RdProductDTO!.ProductName.Trim() != "")
            {
                if (await _context.rdproduct
                    .Where(x => x.BrId == dto.RdProductDTO!.BranchId &&
                                x.ProductName.ToLower() == dto.RdProductDTO!.ProductName.ToLower())
                    .AnyAsync())
                    return "RD Product Name already exists.";
            }

            if (dto.RdProductDTO!.ProductCode.Trim() != "")
            {
                if (await _context.rdproduct
                    .Where(x => x.BrId == dto.RdProductDTO!.BranchId &&
                                x.ProductCode.ToLower() == dto.RdProductDTO!.ProductCode.ToLower())
                    .AnyAsync())
                    return "RD Product Code already exists.";
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Step 1: Insert master product
                var productEntity = MapToEntity(dto.RdProductDTO!);
                _context.rdproduct.Add(productEntity);
                await _context.SaveChangesAsync(); // get generated ID

                // Step 2: Insert definition / rules
                if (dto.RdProductRulesDTO != null)
                {
                    var definitionEntity = MapToEntity(dto.RdProductRulesDTO, productEntity.Id);
                    _context.rdproductdefinition.Add(definitionEntity);
                }

                // Step 3: Insert posting heads
                if (dto.RdProductPostingHeadsDTO != null)
                {
                    var postingEntity = MapToEntity(dto.RdProductPostingHeadsDTO, productEntity.Id);
                    _context.rdproductposting.Add(postingEntity);
                }

                // Step 4: Insert interest rules (multiple rows)
                if (dto.RdProductInterestRulesDetails != null && dto.RdProductInterestRulesDetails.Any())
                {
                    var interestEntities = dto.RdProductInterestRulesDetails
                        .Select(r => MapToEntity(r, productEntity.Id))
                        .ToList();
                    _context.rdproductinterestrules.AddRange(interestEntities);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateProductAsync), nameof(RDProductService));
                throw;
            }

            return "success";
        }

        // ─── UPDATE ───────────────────────────────────────────────────────────────
        public async Task<CombinedRDProductDTO> ModifyProductAsync(CombinedRDProductDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = await _context.rdproduct
                    .FirstOrDefaultAsync(p => p.Id == dto.RdProductDTO!.Id &&
                                              p.BrId == dto.RdProductDTO!.BranchId);

                if (product == null)
                    throw new Exception("RD Product not found.");

                // Duplicate name check (exclude current record)
                if (dto.RdProductDTO!.ProductName.Trim() != "")
                {
                    if (await _context.rdproduct
                        .Where(x => x.BrId == dto.RdProductDTO!.BranchId &&
                                    x.ProductName.ToLower() == dto.RdProductDTO!.ProductName.ToLower() &&
                                    x.Id != dto.RdProductDTO!.Id)
                        .AnyAsync())
                        throw new Exception("RD Product Name already exists.");
                }

                // Duplicate code check (exclude current record)
                if (dto.RdProductDTO!.ProductCode.Trim() != "")
                {
                    if (await _context.rdproduct
                        .Where(x => x.BrId == dto.RdProductDTO!.BranchId &&
                                    x.ProductCode.ToLower() == dto.RdProductDTO!.ProductCode.ToLower() &&
                                    x.Id != dto.RdProductDTO!.Id)
                        .AnyAsync())
                        throw new Exception("RD Product Code already exists.");
                }

                // Update master
                product.ProductName = dto.RdProductDTO!.ProductName;
                product.ProductNameSL = dto.RdProductDTO!.ProductNameInSL;
                product.ProductCode = dto.RdProductDTO!.ProductCode;
                product.EffectiveFrom = dto.RdProductDTO!.EffectiveFrom;

                // Update definition / rules
                if (dto.RdProductRulesDTO != null)
                {
                    var existingDefinition = await _context.rdproductdefinition
                        .FirstOrDefaultAsync(d => d.RDProductId == product.Id && d.BrId == product.BrId);

                    if (existingDefinition != null)
                    {
                        existingDefinition.DocPlanId = dto.RdProductRulesDTO.DocumentPlan;
                        existingDefinition.MinPeriodLimitMonths = dto.RdProductRulesDTO.PeriodLimitMin;
                        existingDefinition.MaxPeriodLimitMonths = dto.RdProductRulesDTO.PeriodLimitMax;
                    }
                }

                // Update posting heads
                if (dto.RdProductPostingHeadsDTO != null)
                {
                    var existingPosting = await _context.rdproductposting
                        .FirstOrDefaultAsync(p => p.RDProductId == product.Id && p.BrId == product.BrId);

                    if (existingPosting != null)
                    {
                        existingPosting.PrincipalBalHeadCode = dto.RdProductPostingHeadsDTO.PrincipalBalHeadCode;
                        existingPosting.IntPayableHeadCode = dto.RdProductPostingHeadsDTO.IntPayableHeadCode;
                    }
                }

                // Update interest rules — delete old rows, insert new ones
                if (dto.RdProductInterestRulesDetails != null && dto.RdProductInterestRulesDetails.Any())
                {
                    var existingRules = _context.rdproductinterestrules
                        .Where(r => r.ProductId == product.Id && r.BrId == product.BrId);

                    _context.rdproductinterestrules.RemoveRange(existingRules);

                    var newRules = dto.RdProductInterestRulesDetails
                        .Select(r => MapToEntity(r, product.Id))
                        .ToList();

                    _context.rdproductinterestrules.AddRange(newRules);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return dto;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(ModifyProductAsync), nameof(RDProductService));
                throw;
            }
        }

        // ─── DELETE ───────────────────────────────────────────────────────────────
        public async Task<bool> DeleteProductAsync(int productId, int branchId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = await _context.rdproduct
                    .FirstOrDefaultAsync(p => p.Id == productId && p.BrId == branchId);

                if (product == null)
                    throw new Exception("RD Product not found.");

                _context.rdproduct.Remove(product);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(DeleteProductAsync), nameof(RDProductService));
                throw;
            }
        }

        // ─── GET BY ID ────────────────────────────────────────────────────────────
        public async Task<CombinedRDProductDTO?> GetRDProductByIdAsync(int id, int branchId)
        {
            var product = await _context.rdproduct
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id && p.BrId == branchId);

            if (product == null) return null;

            var definition = await _context.rdproductdefinition
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.RDProductId == id && d.BrId == branchId);

            var posting = await _context.rdproductposting
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.RDProductId == id && p.BrId == branchId);

            var interestRules = await _context.rdproductinterestrules
                .AsNoTracking()
                .Where(r => r.ProductId == id && r.BrId == branchId)
                .ToListAsync();

            return new CombinedRDProductDTO
            {
                RdProductDTO = MapToDTO(product),
                RdProductRulesDTO = definition != null ? MapToDTO(definition) : null,
                RdProductPostingHeadsDTO = posting != null ? MapToDTO(posting) : null,
                RdProductInterestRulesDetails = interestRules.Select(MapToDTO).ToList()
            };
        }

        // ─── GET ALL (paginated) ──────────────────────────────────────────────────
        public async Task<(List<CombinedRDProductDTO> Items, int TotalCount)> GetAllRDProductsAsync(
            int branchId, LocationFilterDTO filter)
        {
            try
            {
                var query = _context.rdproduct
                    .AsNoTracking()
                    .Where(p => p.BrId == branchId);

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm.ToLower();
                    query = query.Where(p =>
                        p.ProductName.ToLower().Contains(term) ||
                        p.ProductCode.ToLower().Contains(term));
                }

                var totalCount = await query.CountAsync();

                var products = await query
                    .OrderBy(p => p.ProductName)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .ToListAsync();

                if (!products.Any())
                    return (new List<CombinedRDProductDTO>(), totalCount);

                var productIds = products.Select(p => p.Id).ToList();

                var definitionList = await _context.rdproductdefinition
                    .AsNoTracking()
                    .Where(d => productIds.Contains(d.RDProductId!.Value) && d.BrId == branchId)
                    .ToListAsync();

                var postingList = await _context.rdproductposting
                    .AsNoTracking()
                    .Where(p => productIds.Contains(p.RDProductId!.Value) && p.BrId == branchId)
                    .ToListAsync();

                var interestRulesList = await _context.rdproductinterestrules
                    .AsNoTracking()
                    .Where(r => productIds.Contains(r.ProductId!.Value) && r.BrId == branchId)
                    .ToListAsync();

                var combinedList = products.Select(product =>
                {
                    var definition = definitionList.FirstOrDefault(d => d.RDProductId == product.Id);
                    var posting = postingList.FirstOrDefault(p => p.RDProductId == product.Id);
                    var interestRules = interestRulesList.Where(r => r.ProductId == product.Id).ToList();

                    return new CombinedRDProductDTO
                    {
                        RdProductDTO = MapToDTO(product),
                        RdProductRulesDTO = definition != null ? MapToDTO(definition) : null,
                        RdProductPostingHeadsDTO = posting != null ? MapToDTO(posting) : null,
                        RdProductInterestRulesDetails = interestRules.Select(MapToDTO).ToList()
                    };
                }).ToList();

                return (combinedList, totalCount);
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllRDProductsAsync), nameof(RDProductService));
                throw;
            }
        }

        // ─── MAP TO DTO ───────────────────────────────────────────────────────────
        public RDProductDTO MapToDTO(RDProduct entity) => new()
        {
            Id = entity.Id,
            BranchId = entity.BrId,
            ProductName = entity.ProductName,
            ProductNameInSL = entity.ProductNameSL,
            ProductCode = entity.ProductCode,
            EffectiveFrom = entity.EffectiveFrom,
        };

        public RdProductRulesDTO MapToDTO(RDProductDefinition entity) => new()
        {
            Id = entity.Id,
            BranchId = entity.BrId,
            ProductId = entity.RDProductId,
            DocumentPlan = entity.DocPlanId ?? 0,
            PeriodLimitMin = entity.MinPeriodLimitMonths ?? 0,
            PeriodLimitMax = entity.MaxPeriodLimitMonths ?? 0,
        };

        public RdProductPostingHeadsDTO MapToDTO(RDProductPosting entity) => new()
        {
            Id = entity.Id,
            BranchId = entity.BrId,
            ProductId = entity.RDProductId,
            PrincipalBalHeadCode = entity.PrincipalBalHeadCode ?? 0,
            IntPayableHeadCode = entity.IntPayableHeadCode ?? 0,
        };

        public RdProductInterestRuleDetailDTO MapToDTO(RDProductInterestRules entity) => new()
        {
            Id = entity.Id,
            BranchId = entity.BrId,
            ProductId = entity.ProductId,
            ApplicableDate = entity.Date ?? DateTime.MinValue,
            InterestRateFrom = entity.IntRateFrom ?? 0,
            InterestRateTo = entity.IntRateTo ?? 0,
            VariationFrom = entity.IntVariationForAccLess ?? 0,
            VariationTo = entity.IntVariationForAccExceed ?? 0,
            PostingInterval = entity.IntPostingInterval ?? 0,
            CompoundingInterval = entity.IntCompoundingInterval ?? 0,
            ActionOnIntPosting = entity.ActOnIntPosting ?? 0,
            IntRateOnPrematurity = entity.IntRateOnPreMat ?? 0,
            PostMaturityIntRate = entity.PostMaturityIntRate ?? 0,
            MinLockInPeriodDays = entity.MinLockInPerioddays ?? 0,
        };

        // ─── MAP TO ENTITY ────────────────────────────────────────────────────────
        public RDProduct MapToEntity(RDProductDTO dto) => new()
        {
            BrId = dto.BranchId,
            ProductName = dto.ProductName,
            ProductNameSL = dto.ProductNameInSL,
            ProductCode = dto.ProductCode,
            EffectiveFrom = dto.EffectiveFrom,
        };

        public RDProductDefinition MapToEntity(RdProductRulesDTO dto, int productId) => new()
        {
            BrId = dto.BranchId,
            RDProductId = productId,
            DocPlanId = dto.DocumentPlan,
            MinPeriodLimitMonths = dto.PeriodLimitMin,
            MaxPeriodLimitMonths = dto.PeriodLimitMax,
        };

        public RDProductPosting MapToEntity(RdProductPostingHeadsDTO dto, int productId) => new()
        {
            BrId = dto.BranchId,
            RDProductId = productId,
            PrincipalBalHeadCode = dto.PrincipalBalHeadCode,
            IntPayableHeadCode = dto.IntPayableHeadCode
        };

        public RDProductInterestRules MapToEntity(RdProductInterestRuleDetailDTO dto, int productId) => new()
        {
            BrId = dto.BranchId,
            ProductId = productId,
            Date = dto.ApplicableDate,
            IntRateFrom = dto.InterestRateFrom,
            IntRateTo = dto.InterestRateTo,
            IntVariationForAccLess = dto.VariationFrom,
            IntVariationForAccExceed = dto.VariationTo,
            IntPostingInterval = dto.PostingInterval,
            IntCompoundingInterval = dto.CompoundingInterval,
            ActOnIntPosting = dto.ActionOnIntPosting,
            IntRateOnPreMat = dto.IntRateOnPrematurity,
            PostMaturityIntRate = dto.PostMaturityIntRate,
            MinLockInPerioddays = dto.MinLockInPeriodDays,
        };
    }
}
