using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class JournalBookController : ControllerBase
    {
        private readonly JournalBookService _svc;
        public JournalBookController(JournalBookService svc) => _svc = svc;

        // GET /api/JournalBook/session?branchId=1
        [HttpGet("session")]
        public async Task<IActionResult> GetSession([FromQuery] int branchId)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            var (success, message, data) = await _svc.GetSessionDatesAsync(branchId);
            return Ok(new { success, message, data });
        }

        // GET /api/JournalBook?branchId=1&fromDate=2025-01-01&toDate=2025-01-31
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                return BadRequest(new { success = false, message = "Invalid date format." });

            var (success, message, data) = await _svc.GetJournalBookAsync(branchId, from, to);
            return Ok(new { success, message, data });
        }
    }
}
