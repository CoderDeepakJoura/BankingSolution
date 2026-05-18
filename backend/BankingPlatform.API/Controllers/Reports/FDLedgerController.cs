using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FDLedgerController : ControllerBase
    {
        private readonly FDLedgerService _service;
        private readonly ILogger<FDLedgerController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public FDLedgerController(FDLedgerService service, ILogger<FDLedgerController> logger, CommonFunctions commonFunctions)
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
                (var success, var message, var data) = await _service.GetFDProductsAsync(branchId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching FD products.");
                await _commonFunctions.LogErrors(ex, nameof(GetProducts), nameof(FDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts([FromQuery] int branchId, [FromQuery] int productId)
        {
            try
            {
                (var success, var message, var data) = await _service.GetFDAccountsAsync(branchId, productId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching FD accounts.");
                await _commonFunctions.LogErrors(ex, nameof(GetAccounts), nameof(FDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet("details")]
        public async Task<IActionResult> GetDetails([FromQuery] int branchId, [FromQuery] int accountId)
        {
            try
            {
                (var success, var message, var data) = await _service.GetFDDetailsAsync(branchId, accountId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching FD details.");
                await _commonFunctions.LogErrors(ex, nameof(GetDetails), nameof(FDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetLedger(
            [FromQuery] int branchId,
            [FromQuery] int accountId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate,
            [FromQuery] int? detailId = null)
        {
            try
            {
                if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                    return BadRequest(new { Success = false, Message = "Invalid date format." });

                if (from > to)
                    return BadRequest(new { Success = false, Message = "From date cannot be after To date." });

                (var success, var message, var data) = await _service.GetFDLedgerAsync(branchId, accountId, detailId, from, to);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching FD ledger.");
                await _commonFunctions.LogErrors(ex, nameof(GetLedger), nameof(FDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred while fetching the ledger." });
            }
        }
    }
}
