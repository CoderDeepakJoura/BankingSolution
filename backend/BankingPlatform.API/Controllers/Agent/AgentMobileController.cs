using BankingPlatform.API.DTO.Agent;
using BankingPlatform.API.Service.Agent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BankingPlatform.API.Controllers.Agent
{
    [ApiController]
    [Route("api/agentmobile")]
    [Authorize(AuthenticationSchemes = "AgentBearer")]
    public class AgentMobileController : ControllerBase
    {
        private readonly AgentMobileService _service;

        public AgentMobileController(AgentMobileService service) => _service = service;

        private int GetAgentLoginId() =>
            int.TryParse(User.FindFirstValue("agentId"), out var id) ? id : 0;

        private int GetBranchId() =>
            int.TryParse(User.FindFirstValue("branchId"), out var id) ? id : 0;

        private bool IsSuperAgent() =>
            string.Equals(User.FindFirstValue("isSuperAgent"), "true", StringComparison.OrdinalIgnoreCase);

        [HttpGet("rd-accounts")]
        public async Task<IActionResult> GetRDAccounts()
        {
            var result = await _service.GetRDAccountsAsync(GetAgentLoginId(), GetBranchId());
            return Ok(result);
        }

        [HttpGet("saving-accounts")]
        public async Task<IActionResult> GetSavingAccounts()
        {
            var result = await _service.GetSavingAccountsAsync(GetAgentLoginId(), GetBranchId());
            return Ok(result);
        }

        [HttpGet("loan-accounts")]
        public async Task<IActionResult> GetLoanAccounts()
        {
            var result = await _service.GetLoanAccountsAsync(GetAgentLoginId(), GetBranchId());
            return Ok(result);
        }

        [HttpPost("post-collection")]
        public async Task<IActionResult> PostCollection([FromBody] PostAgentCollectionDTO dto)
        {
            dto.BranchId = GetBranchId();
            var (error, result) = await _service.PostCollectionAsync(dto, GetAgentLoginId());
            if (!string.IsNullOrEmpty(error))
                return BadRequest(new { message = error });
            return Ok(result);
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] DateTime? date)
        {
            if (!IsSuperAgent())
                return Forbid();
            var result = await _service.GetSummaryAsync(GetBranchId(), date ?? DateTime.Today);
            return Ok(result);
        }
    }
}
