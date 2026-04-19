using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.ProductMasters.Loan;
using BankingPlatform.Infrastructure.Models.ProductMasters.Loan;

namespace BankingPlatform.API.Service.ProductMasters.Loan
{
    public class LoanProductService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;

        public LoanProductService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonFunctions = commonFunctions;
        }

        public async Task<string> CreateProductAsync(CombinedLoanProductDTO dto)
        {
            var prod = dto.LoanProductDTO!;

            if (await _context.loanproduct.AnyAsync(x => x.BrId == prod.BranchId && x.ProductName.ToLower() == prod.ProductName.ToLower()))
                return "Loan Product Name already exists.";

            if (await _context.loanproduct.AnyAsync(x => x.BrId == prod.BranchId && x.Code.ToLower() == prod.Code.ToLower()))
                return "Loan Product Code already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = MapToEntity(prod);
                _context.loanproduct.Add(product);
                await _context.SaveChangesAsync();

                if (dto.LoanProductDefinitionDTO != null)
                    _context.loanproductdefinition.Add(MapToEntity(dto.LoanProductDefinitionDTO, product.Id));

                LoanProductAdvancement? advEntity = null;
                if (dto.LoanProductAdvancementDTO != null)
                {
                    advEntity = MapToEntity(dto.LoanProductAdvancementDTO, product.Id);
                    _context.loanproductadvancement.Add(advEntity);
                }

                if (dto.LoanProductPostingDTO != null)
                    _context.loanproductposting.Add(MapToEntity(dto.LoanProductPostingDTO, product.Id));

                if (dto.LoanProductRecoveryDTO != null)
                    _context.loanproductrecovery.Add(MapToEntity(dto.LoanProductRecoveryDTO, product.Id));

                await _context.SaveChangesAsync();

                if (dto.LoanProductMarginMoneyRuleDTO != null && advEntity != null)
                    _context.loanproductmarginmoneyrule.Add(MapToEntity(dto.LoanProductMarginMoneyRuleDTO, advEntity.Id));

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                await _commonFunctions.LogErrors(ex, nameof(CreateProductAsync), nameof(LoanProductService));
                throw;
            }
        }

        public async Task<string> ModifyProductAsync(CombinedLoanProductDTO dto)
        {
            var prod = dto.LoanProductDTO!;

            var product = await _context.loanproduct.FirstOrDefaultAsync(p => p.Id == prod.Id && p.BrId == prod.BranchId)
                ?? throw new Exception("Loan Product not found.");

            if (await _context.loanproduct.AnyAsync(x => x.BrId == prod.BranchId && x.ProductName.ToLower() == prod.ProductName.ToLower() && x.Id != prod.Id))
                return "Loan Product Name already exists.";

            if (await _context.loanproduct.AnyAsync(x => x.BrId == prod.BranchId && x.Code.ToLower() == prod.Code.ToLower() && x.Id != prod.Id))
                return "Loan Product Code already exists.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                product.ProductName = prod.ProductName;
                product.Code = prod.Code;
                product.NameSL = prod.NameSL;
                product.EffectiveFrom = prod.EffectiveFrom;

                if (dto.LoanProductDefinitionDTO != null)
                {
                    var def = await _context.loanproductdefinition.FirstOrDefaultAsync(d => d.ProductId == product.Id && d.BrId == product.BrId);
                    if (def != null)
                    {
                        def.TypeId = dto.LoanProductDefinitionDTO.TypeId;
                        def.CategoryId = dto.LoanProductDefinitionDTO.CategoryId;
                        def.SecurityIds = dto.LoanProductDefinitionDTO.SecurityIds;
                        def.SecReviewFreqPeriod = dto.LoanProductDefinitionDTO.SecReviewFreqPeriod;
                        def.DocPlanId = dto.LoanProductDefinitionDTO.DocPlanId;
                        def.IntSchedule = dto.LoanProductDefinitionDTO.IntSchedule;
                        def.IntFormulae = dto.LoanProductDefinitionDTO.IntFormulae;
                        def.ActOnIntPosting = dto.LoanProductDefinitionDTO.ActOnIntPosting;
                    }
                }

                if (dto.LoanProductAdvancementDTO != null)
                {
                    var adv = await _context.loanproductadvancement.FirstOrDefaultAsync(a => a.ProductId == product.Id && a.BrId == product.BrId);
                    if (adv != null)
                    {
                        adv.DisbursmentMode = dto.LoanProductAdvancementDTO.DisbursmentMode;
                        adv.MaxNoofDisbursments = dto.LoanProductAdvancementDTO.MaxNoofDisbursments;
                        adv.MinLoanAmount = dto.LoanProductAdvancementDTO.MinLoanAmount;
                        adv.MaxLoanAmount = dto.LoanProductAdvancementDTO.MaxLoanAmount;
                        adv.IsShareMoneyReq = dto.LoanProductAdvancementDTO.IsShareMoneyReq;
                        adv.LoanPeriodType = dto.LoanProductAdvancementDTO.LoanPeriodType;
                        adv.OverDraftLimit = dto.LoanProductAdvancementDTO.OverDraftLimit;
                        adv.LoanAmtPerOnSecurityRD = dto.LoanProductAdvancementDTO.LoanAmtPerOnSecurityRD;
                        adv.LoanAmtPerOnSecurityFD = dto.LoanProductAdvancementDTO.LoanAmtPerOnSecurityFD;

                        if (dto.LoanProductMarginMoneyRuleDTO != null)
                        {
                            var mmr = await _context.loanproductmarginmoneyrule.FirstOrDefaultAsync(m => m.AdvId == adv.Id && m.BrId == adv.BrId);
                            if (mmr != null)
                            {
                                mmr.RatioOrPerc = dto.LoanProductMarginMoneyRuleDTO.RatioOrPerc;
                                mmr.LoanProportion = dto.LoanProductMarginMoneyRuleDTO.LoanProportion;
                                mmr.MarginProportion = dto.LoanProductMarginMoneyRuleDTO.MarginProportion;
                                mmr.MMPercentage = dto.LoanProductMarginMoneyRuleDTO.MMPercentage;
                            }
                        }
                    }
                }

                if (dto.LoanProductPostingDTO != null)
                {
                    var posting = await _context.loanproductposting.FirstOrDefaultAsync(p => p.ProductId == product.Id && p.BrId == product.BrId);
                    if (posting != null)
                    {
                        posting.PrincipalBalHeadCode = dto.LoanProductPostingDTO.PrincipalBalHeadCode;
                        posting.MiscIncHeadCode = dto.LoanProductPostingDTO.MiscIncHeadCode;
                        posting.MinBalLeftLimitHeadCode = dto.LoanProductPostingDTO.MinBalLeftLimitHeadCode;
                        posting.MinBalGivenLimitHeadCode = dto.LoanProductPostingDTO.MinBalGivenLimitHeadCode;
                        posting.ExpHeadCode = dto.LoanProductPostingDTO.ExpHeadCode;
                        posting.RecoverableIntHeadCode = dto.LoanProductPostingDTO.RecoverableIntHeadCode;
                    }
                }

                if (dto.LoanProductRecoveryDTO != null)
                {
                    var recovery = await _context.loanproductrecovery.FirstOrDefaultAsync(r => r.ProductId == product.Id && r.BrId == product.BrId);
                    if (recovery != null)
                    {
                        recovery.RecoveryMode = dto.LoanProductRecoveryDTO.RecoveryMode;
                        recovery.MinBalLeftLimit = dto.LoanProductRecoveryDTO.MinBalLeftLimit;
                        recovery.MinBalGivenLimit = dto.LoanProductRecoveryDTO.MinBalGivenLimit;
                        recovery.RecoverySeq = BuildRecoverySeq(dto.LoanProductRecoveryDTO);
                        recovery.ApplyOvrIntOn = dto.LoanProductRecoveryDTO.ApplyOvrIntOn;
                        recovery.IntRecoveredInAdvance = dto.LoanProductRecoveryDTO.IntRecoveredInAdvance;
                        recovery.IntPostingInterval = dto.LoanProductRecoveryDTO.IntPostingInterval;
                        recovery.StdOverdueOnKistDate = dto.LoanProductRecoveryDTO.StdOverdueOnKistDate;
                        recovery.RecoveryAdjustmentSeq = dto.LoanProductRecoveryDTO.RecoveryAdjustmentSeq;
                    }
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                await _commonFunctions.LogErrors(ex, nameof(ModifyProductAsync), nameof(LoanProductService));
                throw;
            }
        }

        public async Task<bool> DeleteProductAsync(int productId, int branchId)
        {
            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = await _context.loanproduct.FirstOrDefaultAsync(p => p.Id == productId && p.BrId == branchId)
                    ?? throw new Exception("Loan Product not found.");

                var adv = await _context.loanproductadvancement.FirstOrDefaultAsync(a => a.ProductId == productId && a.BrId == branchId);
                if (adv != null)
                {
                    _context.loanproductmarginmoneyrule.RemoveRange(_context.loanproductmarginmoneyrule.Where(m => m.AdvId == adv.Id && m.BrId == branchId));
                    _context.loanproductadvancement.Remove(adv);
                }

                _context.loanproductdefinition.RemoveRange(_context.loanproductdefinition.Where(d => d.ProductId == productId && d.BrId == branchId));
                _context.loanproductposting.RemoveRange(_context.loanproductposting.Where(p => p.ProductId == productId && p.BrId == branchId));
                _context.loanproductrecovery.RemoveRange(_context.loanproductrecovery.Where(r => r.ProductId == productId && r.BrId == branchId));
                _context.loanproduct.Remove(product);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                await _commonFunctions.LogErrors(ex, nameof(DeleteProductAsync), nameof(LoanProductService));
                throw;
            }
        }

        public async Task<CombinedLoanProductDTO?> GetByIdAsync(int id, int branchId)
        {
            var product = await _context.loanproduct.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id && p.BrId == branchId);
            if (product == null) return null;

            var def = await _context.loanproductdefinition.AsNoTracking().FirstOrDefaultAsync(d => d.ProductId == id && d.BrId == branchId);
            var adv = await _context.loanproductadvancement.AsNoTracking().FirstOrDefaultAsync(a => a.ProductId == id && a.BrId == branchId);
            var mmr = adv != null ? await _context.loanproductmarginmoneyrule.AsNoTracking().FirstOrDefaultAsync(m => m.AdvId == adv.Id && m.BrId == branchId) : null;
            var posting = await _context.loanproductposting.AsNoTracking().FirstOrDefaultAsync(p => p.ProductId == id && p.BrId == branchId);
            var recovery = await _context.loanproductrecovery.AsNoTracking().FirstOrDefaultAsync(r => r.ProductId == id && r.BrId == branchId);

            return new CombinedLoanProductDTO
            {
                LoanProductDTO = MapToDTO(product),
                LoanProductDefinitionDTO = def != null ? MapToDTO(def) : null,
                LoanProductAdvancementDTO = adv != null ? MapToDTO(adv) : null,
                LoanProductMarginMoneyRuleDTO = mmr != null ? MapToDTO(mmr) : null,
                LoanProductPostingDTO = posting != null ? MapToDTO(posting) : null,
                LoanProductRecoveryDTO = recovery != null ? MapToDTO(recovery) : null,
            };
        }

        public async Task<(List<CombinedLoanProductDTO> Items, int TotalCount)> GetAllAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.loanproduct.AsNoTracking().Where(p => p.BrId == branchId);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                query = query.Where(p => p.ProductName.ToLower().Contains(term) || p.Code.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync();
            var products = await query.OrderBy(p => p.ProductName)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            if (!products.Any()) return (new List<CombinedLoanProductDTO>(), totalCount);

            var ids = products.Select(p => p.Id).ToList();

            var defs = await _context.loanproductdefinition.AsNoTracking().Where(d => ids.Contains(d.ProductId) && d.BrId == branchId).ToListAsync();
            var advs = await _context.loanproductadvancement.AsNoTracking().Where(a => ids.Contains(a.ProductId) && a.BrId == branchId).ToListAsync();
            var advIds = advs.Select(a => a.Id).ToList();
            var mmrs = await _context.loanproductmarginmoneyrule.AsNoTracking().Where(m => advIds.Contains(m.AdvId) && m.BrId == branchId).ToListAsync();
            var postings = await _context.loanproductposting.AsNoTracking().Where(p => ids.Contains(p.ProductId) && p.BrId == branchId).ToListAsync();
            var recoveries = await _context.loanproductrecovery.AsNoTracking().Where(r => ids.Contains(r.ProductId) && r.BrId == branchId).ToListAsync();

            var result = products.Select(p =>
            {
                var adv = advs.FirstOrDefault(a => a.ProductId == p.Id);
                var mmr = adv != null ? mmrs.FirstOrDefault(m => m.AdvId == adv.Id) : null;
                return new CombinedLoanProductDTO
                {
                    LoanProductDTO = MapToDTO(p),
                    LoanProductDefinitionDTO = defs.FirstOrDefault(d => d.ProductId == p.Id) is { } d ? MapToDTO(d) : null,
                    LoanProductAdvancementDTO = adv != null ? MapToDTO(adv) : null,
                    LoanProductMarginMoneyRuleDTO = mmr != null ? MapToDTO(mmr) : null,
                    LoanProductPostingDTO = postings.FirstOrDefault(pp => pp.ProductId == p.Id) is { } pp ? MapToDTO(pp) : null,
                    LoanProductRecoveryDTO = recoveries.FirstOrDefault(r => r.ProductId == p.Id) is { } r ? MapToDTO(r) : null,
                };
            }).ToList();

            return (result, totalCount);
        }

        // ─── Mappers ───────────────────────────────────────────────────────────────

        private static string BuildRecoverySeq(LoanProductRecoveryDTO dto)
            => $"{dto.OverDueInterestSeq},{dto.StandardInterestSeq},{dto.OverDueBalanceSeq},{dto.StandardBalanceSeq}";

        private static (int odi, int sti, int odb, int stb) ParseRecoverySeq(string seq)
        {
            var parts = seq.Split(',');
            int get(int i) => parts.Length > i && int.TryParse(parts[i], out var v) ? v : i + 1;
            return (get(0), get(1), get(2), get(3));
        }

        private LoanProduct MapToEntity(LoanProductDTO dto) => new()
        {
            Id = dto.Id, BrId = dto.BranchId, Code = dto.Code,
            ProductName = dto.ProductName, NameSL = dto.NameSL, EffectiveFrom = dto.EffectiveFrom
        };

        private LoanProductDefinition MapToEntity(LoanProductDefinitionDTO dto, int productId) => new()
        {
            Id = dto.Id, BrId = dto.BranchId, ProductId = productId,
            TypeId = dto.TypeId, CategoryId = dto.CategoryId, SecurityIds = dto.SecurityIds,
            SecReviewFreqPeriod = dto.SecReviewFreqPeriod, DocPlanId = dto.DocPlanId,
            IntSchedule = dto.IntSchedule, IntFormulae = dto.IntFormulae, ActOnIntPosting = dto.ActOnIntPosting
        };

        private LoanProductAdvancement MapToEntity(LoanProductAdvancementDTO dto, int productId) => new()
        {
            Id = dto.Id, BrId = dto.BranchId, ProductId = productId,
            DisbursmentMode = dto.DisbursmentMode, MaxNoofDisbursments = dto.MaxNoofDisbursments,
            MinLoanAmount = dto.MinLoanAmount, MaxLoanAmount = dto.MaxLoanAmount,
            IsShareMoneyReq = dto.IsShareMoneyReq, LoanPeriodType = dto.LoanPeriodType,
            OverDraftLimit = dto.OverDraftLimit, LoanAmtPerOnSecurityRD = dto.LoanAmtPerOnSecurityRD,
            LoanAmtPerOnSecurityFD = dto.LoanAmtPerOnSecurityFD
        };

        private LoanProductMarginMoneyRule MapToEntity(LoanProductMarginMoneyRuleDTO dto, int advId) => new()
        {
            Id = dto.Id, BrId = dto.BranchId, AdvId = advId,
            RatioOrPerc = dto.RatioOrPerc, LoanProportion = dto.LoanProportion,
            MarginProportion = dto.MarginProportion, MMPercentage = dto.MMPercentage
        };

        private LoanProductPosting MapToEntity(LoanProductPostingDTO dto, int productId) => new()
        {
            Id = dto.Id, BrId = dto.BranchId, ProductId = productId,
            PrincipalBalHeadCode = dto.PrincipalBalHeadCode, MiscIncHeadCode = dto.MiscIncHeadCode,
            MinBalLeftLimitHeadCode = dto.MinBalLeftLimitHeadCode, MinBalGivenLimitHeadCode = dto.MinBalGivenLimitHeadCode,
            ExpHeadCode = dto.ExpHeadCode, RecoverableIntHeadCode = dto.RecoverableIntHeadCode
        };

        private LoanProductRecovery MapToEntity(LoanProductRecoveryDTO dto, int productId) => new()
        {
            Id = dto.Id, BrId = dto.BranchId, ProductId = productId,
            RecoveryMode = dto.RecoveryMode, RecoverySeq = BuildRecoverySeq(dto),
            MinBalLeftLimit = dto.MinBalLeftLimit, MinBalGivenLimit = dto.MinBalGivenLimit,
            ApplyOvrIntOn = dto.ApplyOvrIntOn, IntRecoveredInAdvance = dto.IntRecoveredInAdvance,
            IntPostingInterval = dto.IntPostingInterval, StdOverdueOnKistDate = dto.StdOverdueOnKistDate,
            RecoveryAdjustmentSeq = dto.RecoveryAdjustmentSeq
        };

        private LoanProductDTO MapToDTO(LoanProduct e) => new()
        {
            Id = e.Id, BranchId = e.BrId, Code = e.Code,
            ProductName = e.ProductName, NameSL = e.NameSL, EffectiveFrom = e.EffectiveFrom
        };

        private LoanProductDefinitionDTO MapToDTO(LoanProductDefinition e) => new()
        {
            Id = e.Id, BranchId = e.BrId, ProductId = e.ProductId,
            TypeId = e.TypeId, CategoryId = e.CategoryId, SecurityIds = e.SecurityIds,
            SecReviewFreqPeriod = e.SecReviewFreqPeriod, DocPlanId = e.DocPlanId,
            IntSchedule = e.IntSchedule, IntFormulae = e.IntFormulae, ActOnIntPosting = e.ActOnIntPosting
        };

        private LoanProductAdvancementDTO MapToDTO(LoanProductAdvancement e) => new()
        {
            Id = e.Id, BranchId = e.BrId, ProductId = e.ProductId,
            DisbursmentMode = e.DisbursmentMode, MaxNoofDisbursments = e.MaxNoofDisbursments,
            MinLoanAmount = e.MinLoanAmount, MaxLoanAmount = e.MaxLoanAmount,
            IsShareMoneyReq = e.IsShareMoneyReq, LoanPeriodType = e.LoanPeriodType,
            OverDraftLimit = e.OverDraftLimit, LoanAmtPerOnSecurityRD = e.LoanAmtPerOnSecurityRD,
            LoanAmtPerOnSecurityFD = e.LoanAmtPerOnSecurityFD
        };

        private LoanProductMarginMoneyRuleDTO MapToDTO(LoanProductMarginMoneyRule e) => new()
        {
            Id = e.Id, BranchId = e.BrId, AdvId = e.AdvId,
            RatioOrPerc = e.RatioOrPerc, LoanProportion = e.LoanProportion,
            MarginProportion = e.MarginProportion, MMPercentage = e.MMPercentage
        };

        private LoanProductPostingDTO MapToDTO(LoanProductPosting e) => new()
        {
            Id = e.Id, BranchId = e.BrId, ProductId = e.ProductId,
            PrincipalBalHeadCode = e.PrincipalBalHeadCode, MiscIncHeadCode = e.MiscIncHeadCode,
            MinBalLeftLimitHeadCode = e.MinBalLeftLimitHeadCode, MinBalGivenLimitHeadCode = e.MinBalGivenLimitHeadCode,
            ExpHeadCode = e.ExpHeadCode, RecoverableIntHeadCode = e.RecoverableIntHeadCode
        };

        private LoanProductRecoveryDTO MapToDTO(LoanProductRecovery e)
        {
            var (odi, sti, odb, stb) = ParseRecoverySeq(e.RecoverySeq ?? "1,2,3,4");
            return new()
            {
                Id = e.Id, BranchId = e.BrId, ProductId = e.ProductId,
                RecoveryMode = e.RecoveryMode, MinBalLeftLimit = e.MinBalLeftLimit,
                MinBalGivenLimit = e.MinBalGivenLimit, OverDueInterestSeq = odi,
                StandardInterestSeq = sti, OverDueBalanceSeq = odb, StandardBalanceSeq = stb,
                ApplyOvrIntOn = e.ApplyOvrIntOn, IntRecoveredInAdvance = e.IntRecoveredInAdvance ?? 0,
                IntPostingInterval = e.IntPostingInterval ?? 0, StdOverdueOnKistDate = e.StdOverdueOnKistDate ?? 0,
                RecoveryAdjustmentSeq = e.RecoveryAdjustmentSeq
            };
        }
    }
}