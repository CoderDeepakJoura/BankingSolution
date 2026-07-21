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
    public class SavingInterestPostingController : ControllerBase
    {
        private readonly SavingInterestPostingService _service;
        private readonly ILogger<SavingInterestPostingController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public SavingInterestPostingController(
            SavingInterestPostingService service,
            ILogger<SavingInterestPostingController> logger,
            CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        /// <summary>
        /// Returns all eligible accounts for interest posting along with calculated interest and monthly breakdown.
        /// Excludes accounts that already had interest posted in the same interval period.
        /// </summary>
        [HttpGet("eligible-accounts")]
        public async Task<IActionResult> GetEligibleAccounts(
            [FromQuery] int branchId,
            [FromQuery] int productId,
            [FromQuery] DateTime postingDate,
            [FromQuery] int? accountId = null)
        {
            try
            {
                if (branchId <= 0 || productId <= 0)
                    return BadRequest(new ResponseDto { Success = false, Message = "BranchId and ProductId are required." });

                var accounts = await _service.GetEligibleAccountsAsync(branchId, productId, postingDate);

                // If a specific account was requested, filter to just that one
                if (accountId.HasValue && accountId.Value > 0)
                    accounts = accounts.Where(a => a.AccountId == accountId.Value).ToList();

                return Ok(new { Success = true, data = accounts });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching eligible accounts for saving interest posting.");
                await _commonFunctions.LogErrors(ex, nameof(GetEligibleAccounts), nameof(SavingInterestPostingController));
                return BadRequest(new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Posts saving interest for the specified accounts.
        /// Creates one voucher per account: Cr saving account, Dr interest expense account.
        /// </summary>
        [HttpPost("post")]
        public async Task<IActionResult> PostInterest([FromBody] PostSavingInterestDTO dto)
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
                _logger.LogError(ex, "Error posting saving interest.");
                await _commonFunctions.LogErrors(ex, nameof(PostInterest), nameof(SavingInterestPostingController));
                return BadRequest(new ResponseDto { Success = false, Message = "Failed to post interest." });
            }
        }
    }
}
