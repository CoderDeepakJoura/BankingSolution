using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.BankFD
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BankFDLedgerController : ControllerBase
    {
        private readonly BankFDLedgerService _service;
        private readonly ILogger<BankFDLedgerController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public BankFDLedgerController(BankFDLedgerService service, ILogger<BankFDLedgerController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts(
            [FromQuery] int branchId,
            [FromQuery] string? query = null,
            [FromQuery] string? fromDate = null,
            [FromQuery] string? toDate = null)
        {
            try
            {
                DateTime? from = fromDate != null && DateTime.TryParse(fromDate, out var fd) ? fd : null;
                DateTime? to   = toDate   != null && DateTime.TryParse(toDate,   out var td) ? td : null;
                var data = await _service.GetAccountsAsync(branchId, query, from, to);
                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Bank FD accounts.");
                await _commonFunctions.LogErrors(ex, nameof(GetAccounts), nameof(BankFDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet("details")]
        public async Task<IActionResult> GetDetails([FromQuery] int branchId, [FromQuery] int accountId)
        {
            try
            {
                var data = await _service.GetDetailsAsync(branchId, accountId);
                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Bank FD details.");
                await _commonFunctions.LogErrors(ex, nameof(GetDetails), nameof(BankFDLedgerController));
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

                (var success, var message, var data) = await _service.GetLedgerAsync(branchId, accountId, detailId, from, to);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Bank FD ledger.");
                await _commonFunctions.LogErrors(ex, nameof(GetLedger), nameof(BankFDLedgerController));
                return BadRequest(new { Success = false, Message = "An error occurred while fetching the ledger." });
            }
        }
    }
}
