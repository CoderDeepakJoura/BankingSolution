using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LoanNPAController : ControllerBase
    {
        private readonly LoanNPAService _svc;

        public LoanNPAController(LoanNPAService svc) => _svc = svc;

        // GET /api/LoanNPA/products?branchId=1
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] int branchId)
        {
            if (branchId <= 0)
                return BadRequest(new { success = false, message = "Invalid branch." });

            var (success, message, data) = await _svc.GetLoanProductsAsync(branchId);
            return Ok(new { success, message, data });
        }

        // GET /api/LoanNPA?branchId=1&asOfDate=2025-05-17&productId=0&npaOnly=false
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] string asOfDate,
            [FromQuery] int productId = 0,
            [FromQuery] bool npaOnly = false)
        {
            if (branchId <= 0)
                return BadRequest(new { success = false, message = "Invalid branch." });

            if (!DateTime.TryParse(asOfDate, out var parsedDate))
                return BadRequest(new { success = false, message = "Invalid date format." });

            var (success, message, data) = await _svc.GetLoanNPAAsync(branchId, parsedDate, productId, npaOnly);
            if (!success)
                return BadRequest(new { success, message });

            return Ok(new { success, message, data });
        }
    }
}
