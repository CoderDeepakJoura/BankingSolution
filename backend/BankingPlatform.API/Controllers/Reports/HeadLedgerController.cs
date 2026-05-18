using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class HeadLedgerController : ControllerBase
    {
        private readonly HeadLedgerService _service;
        private readonly ILogger<HeadLedgerController> _logger;
        private readonly CommonFunctions _cf;

        public HeadLedgerController(HeadLedgerService service, ILogger<HeadLedgerController> logger, CommonFunctions cf)
        {
            _service = service;
            _logger  = logger;
            _cf      = cf;
        }

        [HttpGet("heads")]
        public async Task<IActionResult> GetAccountHeads([FromQuery] int branchId)
        {
            try
            {
                var (success, message, data) = await _service.GetAccountHeadsAsync(branchId);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching account heads.");
                await _cf.LogErrors(ex, nameof(GetAccountHeads), nameof(HeadLedgerController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetHeadLedger(
            [FromQuery] int branchId,
            [FromQuery] long headCode,
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

                var (success, message, data) = await _service.GetHeadLedgerAsync(branchId, headCode, from, to);
                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating head ledger.");
                await _cf.LogErrors(ex, nameof(GetHeadLedger), nameof(HeadLedgerController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
