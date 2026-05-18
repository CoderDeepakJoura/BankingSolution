using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TrialBalanceController : ControllerBase
    {
        private readonly TrialBalanceService _svc;
        public TrialBalanceController(TrialBalanceService svc) => _svc = svc;

        // GET /api/TrialBalance?branchId=1&asOfDate=2025-05-17&sessionId=0
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] string asOfDate,
            [FromQuery] int sessionId = 0)
        {
            if (branchId <= 0)
                return BadRequest(new { success = false, message = "Invalid branch." });
            if (!DateTime.TryParse(asOfDate, out var parsed))
                return BadRequest(new { success = false, message = "Invalid date." });

            var (success, message, data) = await _svc.GetTrialBalanceAsync(branchId, parsed, sessionId);
            return Ok(new { success, message, data });
        }
    }
}
