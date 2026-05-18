using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RDLedgerController : ControllerBase
    {
        private readonly RDLedgerService _service;
        private readonly ILogger<RDLedgerController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public RDLedgerController(RDLedgerService service, ILogger<RDLedgerController> logger, CommonFunctions commonFunctions)
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
                (var success, var message, var data) = await _service.GetRDProductsAsync(branchId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching RD products.");
                await _commonFunctions.LogErrors(ex, nameof(GetProducts), nameof(RDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts([FromQuery] int branchId, [FromQuery] int productId)
        {
            try
            {
                (var success, var message, var data) = await _service.GetRDAccountsAsync(branchId, productId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching RD accounts.");
                await _commonFunctions.LogErrors(ex, nameof(GetAccounts), nameof(RDLedgerController));
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

                (var success, var message, var data) = await _service.GetRDLedgerAsync(branchId, accountId, from, to);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching RD ledger.");
                await _commonFunctions.LogErrors(ex, nameof(GetLedger), nameof(RDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred while fetching the ledger." });
            }
        }
    }
}
