using BankingPlatform.API.DTO.BranchWiseRule;
using BankingPlatform.Infrastructure.Models.BranchWiseRule;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Branchwiserule
{
    [Route("api/[controller]")]
    [ApiController]
    public class RDProductBranchwiseRuleController : ControllerBase
    {
        private readonly BankingDbContext _appcontext;
        private readonly CommonFunctions _commonfunctions;

        public RDProductBranchwiseRuleController(BankingDbContext appcontext, CommonFunctions commonfunctions)
        {
            _appcontext = appcontext;
            _commonfunctions = commonfunctions;
        }

        // ── GET ───────────────────────────────────────────────────────────────────
        [HttpGet("{branchId}/{productId}")]
        public async Task<IActionResult> GetRDProductBranchwiseRuleInfo(
            [FromRoute] int branchId,
            [FromRoute] int productId)
        {
            try
            {
                RDProductBranchWiseRuleDTO rulesDTO =
                    await _commonfunctions.GetRDProductBranchWiseRuleInfo(branchId, productId);

                return Ok(new
                {
                    Success = true,
                    Data = rulesDTO
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(
                    ex,
                    nameof(GetRDProductBranchwiseRuleInfo),
                    nameof(RDProductBranchwiseRuleController));

                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching branchwise rule."
                });
            }
        }

        // ── POST (Insert / Update) ────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> InsertRDProductBranchwiseRule(
            [FromBody] RDProductBranchWiseRuleDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using var transaction = await _appcontext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _appcontext.rdproductbranchwiserule
                    .FirstOrDefaultAsync(x =>
                        x.BrId == dto.BrId &&
                        x.RDProductId == dto.RDProductId);

                if (existing != null)
                {
                    // ── Update existing record ──────────────────────────────────
                    existing.IntFormula = dto.IntFormula;
                    existing.AccNoGeneration = dto.AccNoGeneration;
                    existing.PrintCertificate = dto.PrintCertificate ? (short)1 : (short)0;
                    existing.KistAfterMaturity = dto.KistAfterMaturity ? (short)1 : (short)0;
                    existing.PaymentDateType = dto.PaymentDateType;
                    existing.NoOfDayOrMonth = dto.NoOfDayOrMonth;
                    existing.IntExpAccId = dto.IntExpAccId;
                    existing.PenaltyIncAccId = dto.PenaltyIncAccId;
                    existing.ClosingChargesAcc = dto.ClosingChargesAcc;
                }
                else
                {
                    // ── Insert new record ───────────────────────────────────────
                    var newRule = new RDProductBranchWiseRule
                    {
                        BrId = dto.BrId,
                        RDProductId = dto.RDProductId,
                        IntFormula = dto.IntFormula,
                        AccNoGeneration = dto.AccNoGeneration,
                        PrintCertificate = dto.PrintCertificate ? (short)1 : (short)0,
                        KistAfterMaturity = dto.KistAfterMaturity ? (short)1 : (short)0,
                        PaymentDateType = dto.PaymentDateType,
                        NoOfDayOrMonth = dto.NoOfDayOrMonth,
                        IntExpAccId = dto.IntExpAccId,
                        PenaltyIncAccId = dto.PenaltyIncAccId,
                        ClosingChargesAcc = dto.ClosingChargesAcc,
                    };

                    await _appcontext.rdproductbranchwiserule.AddAsync(newRule);
                }

                await _appcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "RD Product BranchWise Rule saved successfully."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(
                    ex,
                    nameof(InsertRDProductBranchwiseRule),
                    nameof(RDProductBranchwiseRuleController));

                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while saving RD Product BranchWise Rule."
                });
            }
        }
    }
}