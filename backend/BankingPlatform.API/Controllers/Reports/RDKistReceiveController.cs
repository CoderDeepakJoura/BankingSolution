using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RDKistReceiveController : ControllerBase
    {
        private readonly RDKistReceiveService _service;

        public RDKistReceiveController(RDKistReceiveService service) => _service = service;

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] int branchId)
        {
            var (success, message, data) = await _service.GetRDProductsAsync(branchId);
            return Ok(new { success, message, data });
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] int productId = 0,
            [FromQuery] bool showDatewise = false)
        {
            var (success, message, data) = await _service.GetRDKistReceiveAsync(branchId, fromDate, toDate, productId, showDatewise);
            if (!success) return BadRequest(new { success, message });
            return Ok(new { success, message, data });
        }
    }
}
