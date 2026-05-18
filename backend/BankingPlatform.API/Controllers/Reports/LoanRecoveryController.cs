using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LoanRecoveryController : ControllerBase
    {
        private readonly LoanRecoveryService _svc;
        public LoanRecoveryController(LoanRecoveryService svc) => _svc = svc;

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] int branchId)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            var (success, message, data) = await _svc.GetLoanProductsAsync(branchId);
            return Ok(new { success, message, data });
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate,
            [FromQuery] int productId = 0)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                return BadRequest(new { success = false, message = "Invalid date format." });

            var (success, message, data) = await _svc.GetLoanRecoveryAsync(branchId, from, to, productId);
            return Ok(new { success, message, data });
        }
    }
}
