using BankingPlatform.API.DTO.BranchWiseRule;
using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Branchwiserule
{
    [Route("api/[controller]")]
    [ApiController]
    public class FDProductBranchwiseRuleController : ControllerBase
    {
        private readonly BankingDbContext _appcontext;
        private readonly CommonFunctions _commonfunctions;
        public FDProductBranchwiseRuleController(BankingDbContext appcontext, CommonFunctions commonfunctions)
        {
            _appcontext = appcontext;
            _commonfunctions = commonfunctions;
        }
        [HttpGet("{branchId}/{productId}")]
        public async Task<IActionResult> GetFDProductBranchwiseRuleInfo([FromRoute] int branchId, int productId)
        {
            try
            {

                FDDTO rulesDTO = await _commonfunctions.GetFDProductBranchWiseRuleInfo(branchId, productId);
                return Ok(new
                {
                    Success = true,
                    data = rulesDTO
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetFDProductBranchwiseRuleInfo), nameof(FDProductBranchwiseRuleController));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching branchwise rule.",
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> InsertFDProductBranchwiseRule([FromBody] FDDTO branchWiseRuleDTO)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            using var transaction = await _appcontext.Database.BeginTransactionAsync();
            try
            {
                var branchId = branchWiseRuleDTO.BranchId;
                if (branchWiseRuleDTO != null)
                {
                    var branchwiserules = await _appcontext.fdproductbranchwiserule.FirstOrDefaultAsync(x => x.BranchId == branchId && x.FDProductId == branchWiseRuleDTO.FDProductId);
                    if (branchwiserules != null)
                    {
                        branchwiserules.AccNoGeneration = branchWiseRuleDTO.AccNoGeneration;
                        branchwiserules.DaysInAYear = branchWiseRuleDTO.DaysInAYear;
                        branchwiserules.IntExpenseAccount = branchWiseRuleDTO.IntExpenseAccount;
                        branchwiserules.InterestCalculationMethod = branchWiseRuleDTO.InterestCalculationMethod;
                        branchwiserules.ClosingChargesAccount = branchWiseRuleDTO.ClosingChargesAccount;
                        branchwiserules.IntPayableAccount = branchWiseRuleDTO.IntPayableAccount;
                    }
                    else
                    {
                        FDProductBranchWiseRule newRule = new FDProductBranchWiseRule
                        {
                            BranchId = branchWiseRuleDTO.BranchId,
                            AccNoGeneration = branchWiseRuleDTO.AccNoGeneration,
                            DaysInAYear = branchWiseRuleDTO.DaysInAYear,
                            IntExpenseAccount = branchWiseRuleDTO.IntExpenseAccount,
                            InterestCalculationMethod = branchWiseRuleDTO.InterestCalculationMethod,
                            ClosingChargesAccount = branchWiseRuleDTO.ClosingChargesAccount,
                            IntPayableAccount = branchWiseRuleDTO.IntPayableAccount,
                            FDProductId = branchWiseRuleDTO.FDProductId
                        };
                        await _appcontext.fdproductbranchwiserule.AddAsync(newRule);
                    }
                }

                await _appcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "FD Product Branch Wise Rule updated successfully."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(InsertFDProductBranchwiseRule), nameof(FDProductBranchwiseRuleController));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while updating FD Product BranchWise Rule.",
                });
            }
        }
    }
}
