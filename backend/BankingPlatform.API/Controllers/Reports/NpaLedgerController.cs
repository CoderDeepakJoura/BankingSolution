using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class NpaLedgerController : ControllerBase
    {
        private readonly NpaLedgerService _svc;

        public NpaLedgerController(NpaLedgerService svc) => _svc = svc;

        // GET /api/NpaLedger/plans?branchId=1
        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans([FromQuery] int branchId)
        {
            if (branchId <= 0)
                return BadRequest(new { success = false, message = "Invalid branch." });

            var data = await _svc.GetPlansAsync(branchId);
            return Ok(new { success = true, data });
        }

        // GET /api/NpaLedger/categories?branchId=1&planId=2
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories([FromQuery] int branchId, [FromQuery] int planId)
        {
            if (branchId <= 0 || planId <= 0)
                return BadRequest(new { success = false, message = "Invalid parameters." });

            var data = await _svc.GetCategoriesAsync(branchId, planId);
            return Ok(new { success = true, data });
        }

        // POST /api/NpaLedger/report
        [HttpPost("report")]
        public async Task<IActionResult> GetReport([FromBody] NpaLedgerRequestDTO req)
        {
            if (req.BranchId <= 0 || req.PlanId <= 0)
                return BadRequest(new { success = false, message = "Invalid parameters." });

            var data = await _svc.GetNpaLedgerAsync(req);
            return Ok(new { success = true, data });
        }
    }
}
