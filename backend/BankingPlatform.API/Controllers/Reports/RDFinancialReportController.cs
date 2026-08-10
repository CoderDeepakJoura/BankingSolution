using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class RDFinancialReportController : ControllerBase
    {
        private readonly RDFinancialReportService _svc;
        public RDFinancialReportController(RDFinancialReportService svc) => _svc = svc;

        // GET /api/RDFinancialReport?branchId=1&fromDate=2025-04-01&toDate=2025-06-30&showAllClBal=false
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate,
            [FromQuery] bool showAllClBal = false)
        {
            if (branchId <= 0)
                return BadRequest(new { success = false, message = "Invalid branch." });
            if (!DateTime.TryParse(fromDate, out var parsedFrom))
                return BadRequest(new { success = false, message = "Invalid From Date." });
            if (!DateTime.TryParse(toDate, out var parsedTo))
                return BadRequest(new { success = false, message = "Invalid To Date." });
            if (parsedFrom > parsedTo)
                return BadRequest(new { success = false, message = "From Date cannot be after To Date." });

            var (success, message, data) = await _svc.GetAsync(branchId, parsedFrom, parsedTo, showAllClBal);
            return Ok(new { success, message, data });
        }
    }
}
