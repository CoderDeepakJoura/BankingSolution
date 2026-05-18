using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Service.Vouchers.Loan;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.Loan
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LoanInterestPostingController : ControllerBase
    {
        private readonly LoanInterestPostingService _service;
        private readonly ILogger<LoanInterestPostingController> _logger;

        public LoanInterestPostingController(LoanInterestPostingService service, ILogger<LoanInterestPostingController> logger)
        {
            _service = service;
            _logger  = logger;
        }

        /// <summary>Search active loan accounts by name or account number, optionally filtered by product.</summary>
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] int branchId, [FromQuery] string query = "", [FromQuery] int? productId = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(query))
                    return Ok(new List<LoanAccountSearchDTO>());

                var result = await _service.SearchLoanAccountsAsync(branchId, query, productId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching loan accounts for interest posting");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>Get unposted interest info for a loan account.</summary>
        [HttpGet("postable/{loanAccId}/{branchId}")]
        public async Task<IActionResult> GetPostableInterest(int loanAccId, int branchId)
        {
            try
            {
                var result = await _service.GetPostableInterestAsync(loanAccId, branchId);
                if (result == null)
                    return NotFound(new { Success = false, Message = "Loan account not found." });

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching postable interest");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>Batch-calculate unposted interest for all accounts of a product (or a single account).</summary>
        [HttpGet("batch-calculate")]
        public async Task<IActionResult> BatchCalculate([FromQuery] int brId, [FromQuery] int productId, [FromQuery] int? accountId = null)
        {
            try
            {
                if (productId <= 0)
                    return BadRequest(new { Success = false, Message = "productId is required." });

                var result = await _service.BatchCalculateInterestAsync(brId, productId, accountId);
                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in batch interest calculation");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>Batch-post interest for a list of loan accounts.</summary>
        [HttpPost("batch-post")]
        public async Task<IActionResult> BatchPost([FromBody] LoanInterestBatchPostRequestDTO dto)
        {
            try
            {
                if (dto == null || dto.Items == null || dto.Items.Count == 0)
                    return BadRequest(new { Success = false, Message = "No items to post." });

                var result = await _service.BatchPostInterestAsync(dto);
                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in batch interest posting");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>Save a loan interest posting voucher.</summary>
        [HttpPost]
        public async Task<IActionResult> PostInterest([FromBody] LoanInterestPostingVoucherDTO dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new { Success = false, Message = "Invalid request." });

                var (result, voucherNo) = await _service.PostInterestAsync(dto);

                if (result != "Success")
                    return BadRequest(new { Success = false, Message = result });

                return Ok(new { Success = true, Message = $"Interest posting voucher #{voucherNo} saved successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving interest posting voucher");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
