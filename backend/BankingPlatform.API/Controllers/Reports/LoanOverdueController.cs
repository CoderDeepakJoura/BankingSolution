using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LoanOverdueController : ControllerBase
    {
        private readonly LoanOverdueReportService _svc;

        public LoanOverdueController(LoanOverdueReportService svc) => _svc = svc;

        // GET /api/LoanOverdue/products?branchId=1
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] int branchId)
        {
            if (branchId <= 0)
                return BadRequest(new { success = false, message = "Invalid branch." });

            var (success, message, data) = await _svc.GetLoanProductsAsync(branchId);
            return Ok(new { success, message, data });
        }

        // GET /api/LoanOverdue?branchId=1&asOfDate=2025-09-23&productId=0&overdueOnly=true
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] string asOfDate,
            [FromQuery] int productId = 0,
            [FromQuery] bool overdueOnly = true)
        {
            if (branchId <= 0)
                return BadRequest(new { success = false, message = "Invalid branch." });

            if (!DateTime.TryParse(asOfDate, out var parsedDate))
                return BadRequest(new { success = false, message = "Invalid date format." });

            var (success, message, data) = await _svc.GetLoanOverdueAsync(branchId, parsedDate, productId, overdueOnly);
            if (!success)
                return BadRequest(new { success, message });

            return Ok(new { success, message, data });
        }
    }
}
