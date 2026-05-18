using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CashBookController : ControllerBase
    {
        private readonly CashBookService _service;
        private readonly ILogger<CashBookController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public CashBookController(CashBookService service, ILogger<CashBookController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet]
        public async Task<IActionResult> GetCashBook(
            [FromQuery] int branchId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate)
        {
            try
            {
                if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                    return BadRequest(new { Success = false, Message = "Invalid date format." });

                if (from > to)
                    return BadRequest(new { Success = false, Message = "From date cannot be after To date." });

                (var success, var message, var data) = await _service.GetCashBookAsync(branchId, from, to);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching cash book.");
                await _commonFunctions.LogErrors(ex, nameof(GetCashBook), nameof(CashBookController));
                return BadRequest(new { Success = false, Message = "An error occurred while fetching the cash book." });
            }
        }
    }
}
