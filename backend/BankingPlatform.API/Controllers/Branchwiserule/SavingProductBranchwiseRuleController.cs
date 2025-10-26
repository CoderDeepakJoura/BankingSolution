using BankingPlatform.API.Controllers.Member;
using BankingPlatform.API.DTO.BranchWiseRule;
using BankingPlatform.API.DTO.Settings;
using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using BankingPlatform.Infrastructure.Models.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Branchwiserule
{
    [Route("api/[controller]")]
    [ApiController]
    public class SavingProductBranchwiseRuleController : ControllerBase
    {
        private readonly BankingDbContext _appcontext;
        private readonly CommonFunctions _commonfunctions;
        public SavingProductBranchwiseRuleController(BankingDbContext appcontext, CommonFunctions commonfunctions)
        {
            _appcontext = appcontext;
            _commonfunctions = commonfunctions;
        }
        [HttpGet("{branchId}/{productId}")]
        public async Task<IActionResult> GetSavingProductBranchwiseRuleInfo([FromRoute] int branchId, int productId)
        {
            try
            {

                SavingDTO rulesDTO = await _commonfunctions.GetSavingProductBranchWiseRuleInfo(branchId, productId);
                return Ok(new
                {
                    Success = true,
                    data = rulesDTO
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetSavingProductBranchwiseRuleInfo), nameof(SavingProductBranchwiseRuleController));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching branchwise rule.",
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> InsertSavingProductBranchwiseRule([FromBody] SavingDTO branchWiseRuleDTO)
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
                    var branchwiserules = await _appcontext.savingproductbranchwiserule.FirstOrDefaultAsync(x => x.BranchId == branchId && x.SavingProductId == branchWiseRuleDTO.SavingProductId);
                    if (branchwiserules != null)
                    {
                        branchwiserules.depwithdrawlimitinterval = branchWiseRuleDTO.depwithdrawlimitinterval;
                        branchwiserules.depwithdrawlimit = branchWiseRuleDTO.depwithdrawlimit;
                        branchwiserules.intexpaccount = branchWiseRuleDTO.intexpaccount;
                        branchwiserules.SavingProductId = branchWiseRuleDTO.SavingProductId;
                    }
                    else
                    {                
                        SavingProductBranchWiseRule newRule = new SavingProductBranchWiseRule
                        {
                            BranchId = branchWiseRuleDTO.BranchId,
                            depwithdrawlimitinterval = branchWiseRuleDTO.depwithdrawlimitinterval,
                            depwithdrawlimit = branchWiseRuleDTO.depwithdrawlimit,
                            intexpaccount = branchWiseRuleDTO.intexpaccount,
                            SavingProductId = branchWiseRuleDTO.SavingProductId
                        };
                        await _appcontext.savingproductbranchwiserule.AddAsync(newRule);
                    }
                }

                // Save all changes
                await _appcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Saving Product Branch Wise Rule updated successfully."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(InsertSavingProductBranchwiseRule), nameof(SavingProductBranchWiseRule));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while updating Saving Product BranchWise Rule.",
                });
            }
        }

    }
}
