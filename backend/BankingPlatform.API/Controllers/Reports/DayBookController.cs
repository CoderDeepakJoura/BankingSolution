using BankingPlatform.API.Common;
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
            [FromQuery] string toDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 0)
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

                // Pagination metadata — entries are paginated when pageSize > 0
                if (data != null && pageSize > 0)
                {
                    int safePage = Math.Max(1, page);
                    int safeSize = Math.Clamp(pageSize, 1, 500);
                    int totalVouchers = data.TotalVoucherCount;
                    int totalPages = (int)Math.Ceiling((double)totalVouchers / safeSize);
                    return Ok(new { Success = true, Message = message, Data = data, Pagination = new {
                        Page = safePage, PageSize = safeSize, TotalCount = totalVouchers,
                        TotalPages = totalPages, HasPrevious = safePage > 1, HasNext = safePage < totalPages
                    }});
                }

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
