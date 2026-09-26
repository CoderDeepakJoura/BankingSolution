using BankingPlatform.API.Service.FDBond;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.FDBond
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FDBondController : ControllerBase
    {
        private readonly FDBondService _service;

        public FDBondController(FDBondService service) => _service = service;

        // GET /api/FDBond/{branchId}/{fdDetailId}
        [HttpGet("{branchId}/{fdDetailId}")]
        public async Task<IActionResult> GetBond([FromRoute] int branchId, [FromRoute] int fdDetailId)
        {
            var bytes = await _service.GenerateBondAsync(branchId, fdDetailId);
            if (bytes == null) return NotFound(new { success = false, message = "FD detail not found." });
            return File(bytes, "application/pdf", $"FD-Bond-{fdDetailId}.pdf");
        }

        // GET /api/FDBond/list/{branchId}/{accountId}
        [HttpGet("list/{branchId}/{accountId}")]
        public async Task<IActionResult> ListFdDetails([FromRoute] int branchId, [FromRoute] int accountId)
        {
            var details = await _service.GetFdDetailsForAccountAsync(branchId, accountId);
            return Ok(new { success = true, data = details });
        }
    }
}
