using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.API.Service.Vouchers.Loan;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Vouchers.Loan
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LoanRecoveryController : ControllerBase
    {
        private readonly LoanRecoveryVoucherService _service;
        private readonly ILogger<LoanRecoveryController> _logger;
        private readonly CommonFunctions _cf;

        public LoanRecoveryController(
            LoanRecoveryVoucherService service,
            ILogger<LoanRecoveryController> logger,
            CommonFunctions cf)
        {
            _service = service;
            _logger  = logger;
            _cf      = cf;
        }

        /// <summary>Search loan accounts by account number or name.</summary>
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] int branchId, [FromQuery] string query = "")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(query))
                    return Ok(new List<LoanAccountSearchDTO>());

                var result = await _service.SearchLoanAccountsAsync(branchId, query);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching loan accounts");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>Get current balance, outstanding interest, and account info for a loan.</summary>
        [HttpGet("balance/{loanAccId}/{branchId}")]
        public async Task<IActionResult> GetBalance(int loanAccId, int branchId)
        {
            try
            {
                var result = await _service.GetLoanBalanceAsync(loanAccId, branchId);
                if (result == null)
                    return NotFound(new { Success = false, Message = "Loan account not found." });

                return Ok(new { Success = true, Message = "OK", Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching loan balance");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>Get installment (kist) schedule for a loan account.</summary>
        [HttpGet("kist-schedule/{loanAccId}/{branchId}")]
        public async Task<IActionResult> GetKistSchedule(int loanAccId, int branchId)
        {
            try
            {
                var result = await _service.GetKistScheduleAsync(loanAccId, branchId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching kist schedule");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>Save a new loan recovery voucher.</summary>
        [HttpPost]
        public async Task<IActionResult> AddRecovery([FromBody] LoanRecoveryVoucherDTO dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new { Success = false, Message = "Invalid request." });

                var (result, voucherNo) = await _service.AddLoanRecoveryVoucherAsync(dto);

                if (result != "Success")
                    return BadRequest(new { Success = false, Message = result });

                return Ok(new { Success = true, Message = $"Recovery voucher #{voucherNo} saved successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving loan recovery voucher");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
