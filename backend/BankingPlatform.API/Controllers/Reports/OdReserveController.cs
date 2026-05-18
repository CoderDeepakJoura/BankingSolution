using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class OdReserveController : ControllerBase
    {
        private readonly OdReserveService _svc;
        public OdReserveController(OdReserveService svc) => _svc = svc;

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] int branchId)
        {
            var (ok, msg, data) = await _svc.GetLoanProductsAsync(branchId);
            return ok ? Ok(new { success = true, data }) : BadRequest(new { success = false, message = msg });
        }

        [HttpGet("general-accounts")]
        public async Task<IActionResult> GetGeneralAccounts([FromQuery] int branchId)
        {
            var (ok, msg, data) = await _svc.GetGeneralAccountsAsync(branchId);
            return ok ? Ok(new { success = true, data }) : BadRequest(new { success = false, message = msg });
        }

        [HttpGet]
        public async Task<IActionResult> GetReport(
            [FromQuery] int branchId,
            [FromQuery] int productId,
            [FromQuery] string quarterDate)
        {
            if (!DateTime.TryParse(quarterDate, out var qDate))
                return BadRequest(new { success = false, message = "Invalid quarter date." });

            var (ok, msg, data) = await _svc.GetOdReserveReportAsync(branchId, productId, qDate);
            return ok ? Ok(new { success = true, data }) : BadRequest(new { success = false, message = msg });
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] OdReserveSaveRequest req)
        {
            if (!DateTime.TryParse(req.QuarterDate, out var qDate))
                return BadRequest(new { success = false, message = "Invalid quarter date." });

            var (ok, msg) = await _svc.SaveOdReserveAsync(req.BranchId, req.ProductId, qDate, req.Rows);
            return ok ? Ok(new { success = true, message = msg }) : BadRequest(new { success = false, message = msg });
        }
    }

    public class OdReserveSaveRequest
    {
        public int BranchId { get; set; }
        public int ProductId { get; set; }
        public string QuarterDate { get; set; } = "";
        public List<OdReserveRowDTO> Rows { get; set; } = new();
    }
}
