using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DayBookController : ControllerBase
    {
        private readonly DayBookService _service;
        private readonly ILogger<DayBookController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public DayBookController(DayBookService service, ILogger<DayBookController> logger, CommonFunctions commonFunctions)
        {
            _service = service;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [HttpGet("session")]
        public async Task<IActionResult> GetSessionDates([FromQuery] int branchId)
        {
            try
            {
                (var success, var message, var data) = await _service.GetSessionDatesAsync(branchId);
                if (!success)
                    return BadRequest(new { Success = false, Message = message });
                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching session dates.");
                await _commonFunctions.LogErrors(ex, nameof(GetSessionDates), nameof(DayBookController));
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetDayBook(
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

                (var success, var message, var data) = await _service.GetDayBookAsync(branchId, from, to);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching day book.");
                await _commonFunctions.LogErrors(ex, nameof(GetDayBook), nameof(DayBookController));
                return BadRequest(new { Success = false, Message = "An error occurred while fetching the day book." });
            }
        }
    }
}
