using BankingPlatform.API.DTO.Agent;
using BankingPlatform.API.Service.Agent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Agent
{
    [ApiController]
    [Route("api/agentloginmanagement")]
    [Authorize]
    public class AgentLoginManagementController : ControllerBase
    {
        private readonly AgentLoginManagementService _service;

        public AgentLoginManagementController(AgentLoginManagementService service) => _service = service;

        [HttpGet("{branchId:int}")]
        public async Task<IActionResult> GetAll(int branchId) =>
            Ok(new { Success = true, Data = await _service.GetAllAsync(branchId) });

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAgentLoginDTO dto)
        {
            var result = await _service.CreateAsync(dto);
            if (result != "Success")
                return BadRequest(new { message = result });
            return Ok(new { message = "Agent login created." });
        }

        [HttpPatch("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetAgentPasswordDTO dto)
        {
            var result = await _service.ResetPasswordAsync(dto);
            if (result != "Success")
                return BadRequest(new { message = result });
            return Ok(new { message = "Password reset successfully." });
        }

        [HttpPatch("toggle")]
        public async Task<IActionResult> Toggle([FromBody] ToggleAgentLoginDTO dto)
        {
            var result = await _service.ToggleActiveAsync(dto);
            if (result != "Success")
                return BadRequest(new { message = result });
            return Ok(new { message = "Status updated." });
        }

        [HttpDelete("{id:int}/{branchId:int}")]
        public async Task<IActionResult> Delete(int id, int branchId)
        {
            var result = await _service.DeleteAsync(id, branchId);
            if (result != "Success")
                return NotFound(new { message = result });
            return Ok(new { message = "Agent login deleted." });
        }
    }
}
