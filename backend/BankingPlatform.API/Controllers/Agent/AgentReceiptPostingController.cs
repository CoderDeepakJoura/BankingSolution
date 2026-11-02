using BankingPlatform.API.DTO.Agent;
using BankingPlatform.API.Service.Agent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Agent
{
    [ApiController]
    [Route("api/agentreceiptposting")]
    [Authorize]
    public class AgentReceiptPostingController : ControllerBase
    {
        private readonly AgentReceiptPostingService _service;

        public AgentReceiptPostingController(AgentReceiptPostingService service) => _service = service;

        [HttpGet("unposted/{branchId:int}")]
        public async Task<IActionResult> GetUnposted(int branchId, [FromQuery] DateTime? date, [FromQuery] string? accType)
        {
            var data = await _service.GetUnpostedAsync(branchId, date, accType);
            return Ok(new { data, success = true });
        }

        [HttpPost("batch-post")]
        public async Task<IActionResult> BatchPost([FromBody] BatchPostCollectionsDTO dto)
        {
            if (dto.CollectionIds == null || !dto.CollectionIds.Any())
                return BadRequest(new { message = "No collection IDs provided." });
            var data = await _service.BatchPostAsync(dto);
            return Ok(new { data, success = true });
        }
    }
}
