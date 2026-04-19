using BankingPlatform.API.DTO.BranchWiseRule;
using BankingPlatform.API.DTO.Settings;
using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Branchwiserule
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LoanProductBranchWiseRuleController : ControllerBase
    {
        private readonly BankingDbContext _appcontext;
        private readonly CommonFunctions _commonfunctions;

        public LoanProductBranchWiseRuleController(BankingDbContext appcontext, CommonFunctions commonfunctions)
        {
            _appcontext = appcontext;
            _commonfunctions = commonfunctions;
        }

        [HttpGet("{branchId}/{productId}")]
        public async Task<IActionResult> GetLoanProductBranchWiseRuleInfo([FromRoute] int branchId, int productId)
        {
            try
            {
                var dto = await _commonfunctions.GetLoanProductBranchWiseRuleInfo(branchId, productId);
                return Ok(new { Success = true, data = dto });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetLoanProductBranchWiseRuleInfo), nameof(LoanProductBranchWiseRuleController));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching loan product branchwise rule."
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveLoanProductBranchWiseRule([FromBody] LoanProductBranchWiseRuleDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            using var transaction = await _appcontext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _appcontext.loanproductbranchwiserule
                    .FirstOrDefaultAsync(x => x.BranchId == dto.BranchId && x.LoanProductId == dto.LoanProductId);

                if (existing != null)
                {
                    existing.MCLPlanId = dto.MCLPlanId;
                    existing.NPAPlanId = dto.NPAPlanId;
                    existing.LegalPlanId = dto.LegalPlanId;
                    existing.OperatedBy = dto.OperatedBy;
                    existing.AccNoOrNameFirst = dto.AccNoOrNameFirst;
                    existing.TempRecAccId = dto.TempRecAccId;
                    existing.CurrentRecoverableIntAcc = dto.CurrentRecoverableIntAcc;
                    existing.IntIncomeAcc = dto.IntIncomeAcc;
                    existing.OverdueRecoverableIntAcc = dto.OverdueRecoverableIntAcc;
                    existing.IsApplyOverInt = dto.IsApplyOverInt;
                    existing.OVRIntProvAcc = dto.OVRIntProvAcc;
                    existing.IntwrtDepositPledge = dto.IntwrtDepositPledge;
                    existing.OVRIntFromOpendate = dto.OVRIntFromOpendate;
                    existing.ActOnExpPosting = dto.ActOnExpPosting;
                }
                else
                {
                    await _appcontext.loanproductbranchwiserule.AddAsync(new LoanProductBranchWiseRule
                    {
                        BranchId = dto.BranchId,
                        LoanProductId = dto.LoanProductId,
                        MCLPlanId = dto.MCLPlanId,
                        NPAPlanId = dto.NPAPlanId,
                        LegalPlanId = dto.LegalPlanId,
                        OperatedBy = dto.OperatedBy,
                        AccNoOrNameFirst = dto.AccNoOrNameFirst,
                        TempRecAccId = dto.TempRecAccId,
                        CurrentRecoverableIntAcc = dto.CurrentRecoverableIntAcc,
                        IntIncomeAcc = dto.IntIncomeAcc,
                        OverdueRecoverableIntAcc = dto.OverdueRecoverableIntAcc,
                        IsApplyOverInt = dto.IsApplyOverInt,
                        OVRIntProvAcc = dto.OVRIntProvAcc,
                        IntwrtDepositPledge = dto.IntwrtDepositPledge,
                        OVRIntFromOpendate = dto.OVRIntFromOpendate,
                        ActOnExpPosting = dto.ActOnExpPosting,
                    });
                }

                await _appcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Loan Product Branch Wise Rule saved successfully."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(SaveLoanProductBranchWiseRule), nameof(LoanProductBranchWiseRuleController));
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while saving Loan Product BranchWise Rule."
                });
            }
        }
    }
}
