using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LoanIntCertController : ControllerBase
    {
        private readonly LoanIntCertService _svc;
        public LoanIntCertController(LoanIntCertService svc) => _svc = svc;

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] int branchId)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            var (success, message, data) = await _svc.GetLoanProductsAsync(branchId);
            return Ok(new { success, message, data });
        }

        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts([FromQuery] int branchId, [FromQuery] int productId = 0)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            var (success, message, data) = await _svc.GetLoanAccountsAsync(branchId, productId);
            return Ok(new { success, message, data });
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] int accountId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            if (accountId <= 0) return BadRequest(new { success = false, message = "Invalid account." });
            if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                return BadRequest(new { success = false, message = "Invalid date format." });

            var (success, message, data) = await _svc.GetLoanIntCertAsync(branchId, accountId, from, to);
            if (!success) return BadRequest(new { success, message, data });
            return Ok(new { success, message, data });
        }
    }
}
