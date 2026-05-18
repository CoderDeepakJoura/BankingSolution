using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GeneralLedgerController : ControllerBase
    {
        private readonly GeneralLedgerService _service;
        private readonly ILogger<GeneralLedgerController> _logger;
        private readonly CommonFunctions _cf;

        public GeneralLedgerController(GeneralLedgerService service, ILogger<GeneralLedgerController> logger, CommonFunctions cf)
        {
            _service = service;
            _logger  = logger;
            _cf      = cf;
        }

        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccountsForHead([FromQuery] int branchId, [FromQuery] long headCode)
        {
            try
            {
                var (success, message, data) = await _service.GetAccountsForHeadAsync(branchId, headCode);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching accounts for head.");
                await _cf.LogErrors(ex, nameof(GetAccountsForHead), nameof(GeneralLedgerController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetGeneralLedger(
            [FromQuery] int branchId,
            [FromQuery] int accountId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate)
        {
            try
            {
                if (!DateTime.TryParse(fromDate, out var from))
                    return BadRequest(new { Success = false, Message = "Invalid fromDate format." });

                if (!DateTime.TryParse(toDate, out var to))
                    return BadRequest(new { Success = false, Message = "Invalid toDate format." });

                if (from > to)
                    return BadRequest(new { Success = false, Message = "fromDate must be on or before toDate." });

                var (success, message, data) = await _service.GetGeneralLedgerAsync(branchId, accountId, from, to);
                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating general ledger.");
                await _cf.LogErrors(ex, nameof(GetGeneralLedger), nameof(GeneralLedgerController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
