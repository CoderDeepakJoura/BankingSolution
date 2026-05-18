using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BalanceSheetController : ControllerBase
    {
        private readonly BalanceSheetService _service;
        private readonly ILogger<BalanceSheetController> _logger;
        private readonly CommonFunctions _cf;

        public BalanceSheetController(BalanceSheetService service, ILogger<BalanceSheetController> logger, CommonFunctions cf)
        {
            _service = service;
            _logger  = logger;
            _cf      = cf;
        }

        [HttpGet]
        public async Task<IActionResult> GetBalanceSheet([FromQuery] int branchId, [FromQuery] string asOfDate)
        {
            try
            {
                if (!DateTime.TryParse(asOfDate, out var date))
                    return BadRequest(new { Success = false, Message = "Invalid date format." });

                var (success, message, data) = await _service.GetBalanceSheetAsync(branchId, date);
                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating balance sheet.");
                await _cf.LogErrors(ex, nameof(GetBalanceSheet), nameof(BalanceSheetController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
