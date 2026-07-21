using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.Service.AccountMasters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.AccountMasters
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RDInterestPostingController : ControllerBase
    {
        private readonly RDInterestPostingService _service;
        private readonly ILogger<RDInterestPostingController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public RDInterestPostingController(
            RDInterestPostingService service,
            ILogger<RDInterestPostingController> logger,
            CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("eligible-accounts")]
        public async Task<IActionResult> GetEligibleAccounts(
            [FromQuery] int branchId,
            [FromQuery] int productId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] int? accountId = null)
        {
            try
            {
                if (branchId <= 0 || productId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "BranchId and ProductId are required." });

                var result = await _service.GetEligibleAccountsAsync(branchId, productId, fromDate, toDate, accountId);
                return Ok(new { Success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching eligible RD accounts.");
                await _commonFunctions.LogErrors(ex, nameof(GetEligibleAccounts), nameof(RDInterestPostingController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("post")]
        public async Task<IActionResult> PostInterest([FromBody] PostRDInterestDTO dto)
        {
            try
            {
                if (dto.AccountIds == null || dto.AccountIds.Count == 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "No accounts selected." });

                var result = await _service.PostInterestAsync(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto { Success = false, Message = result });

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = $"RD Interest posted successfully for {dto.AccountIds.Count} account(s)."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error posting RD interest.");
                await _commonFunctions.LogErrors(ex, nameof(PostInterest), nameof(RDInterestPostingController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to post RD interest." });
            }
        }
    }
}
