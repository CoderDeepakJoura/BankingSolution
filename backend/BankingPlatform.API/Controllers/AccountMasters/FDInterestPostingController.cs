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
    public class FDInterestPostingController : ControllerBase
    {
        private readonly FDInterestPostingService _service;
        private readonly ILogger<FDInterestPostingController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public FDInterestPostingController(
            FDInterestPostingService service,
            ILogger<FDInterestPostingController> logger,
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
            [FromQuery] DateTime postingDate,
            [FromQuery] bool isMIS = false,
            [FromQuery] int? accountId = null)
        {
            try
            {
                if (branchId <= 0 || productId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "BranchId and ProductId are required." });

                var accounts = await _service.GetEligibleAccountsAsync(branchId, productId, postingDate, isMIS, accountId);
                return Ok(new { Success = true, data = accounts });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching eligible FD accounts for interest posting.");
                await _commonFunctions.LogErrors(ex, nameof(GetEligibleAccounts), nameof(FDInterestPostingController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("post")]
        public async Task<IActionResult> PostInterest([FromBody] PostFDInterestDTO dto)
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
                    Message = $"Interest posted successfully for {dto.AccountIds.Count} account(s)."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error posting FD interest.");
                await _commonFunctions.LogErrors(ex, nameof(PostInterest), nameof(FDInterestPostingController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to post interest." });
            }
        }
    }
}
