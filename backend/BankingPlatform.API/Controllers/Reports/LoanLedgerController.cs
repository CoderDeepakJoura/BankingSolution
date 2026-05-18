using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LoanLedgerController : ControllerBase
    {
        private readonly LoanLedgerService _service;
        private readonly ILogger<LoanLedgerController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public LoanLedgerController(LoanLedgerService service, ILogger<LoanLedgerController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] int branchId)
        {
            try
            {
                (var success, var message, var data) = await _service.GetLoanProductsAsync(branchId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching loan products.");
                await _commonFunctions.LogErrors(ex, nameof(GetProducts), nameof(LoanLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts([FromQuery] int branchId, [FromQuery] int productId)
        {
            try
            {
                (var success, var message, var data) = await _service.GetLoanAccountsAsync(branchId, productId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching loan accounts.");
                await _commonFunctions.LogErrors(ex, nameof(GetAccounts), nameof(LoanLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetLedger(
            [FromQuery] int branchId,
            [FromQuery] int accountId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate)
        {
            try
            {
                if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                    return BadRequest(new { Success = false, Message = "Invalid date format." });

                if (from > to)
                    return BadRequest(new { Success = false, Message = "From date cannot be after To date." });

                (var success, var message, var data) = await _service.GetLoanLedgerAsync(branchId, accountId, from, to);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching loan ledger.");
                await _commonFunctions.LogErrors(ex, nameof(GetLedger), nameof(LoanLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred while fetching the ledger." });
            }
        }
    }
}
