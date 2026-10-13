using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Agent;
using BankingPlatform.API.Service.Agent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Agent
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AgentMasterController : ControllerBase
    {
        private readonly AgentMasterService _service;
        public AgentMasterController(AgentMasterService service) => _service = service;

        [HttpPost("get-all/{branchId}")]
        public async Task<IActionResult> GetAll(int branchId, [FromBody] AgentFilterDTO filter)
        {
            var (items, total) = await _service.GetAllAsync(branchId, filter);
            return Ok(new { Success = true, Items = items, TotalCount = total });
        }

        [HttpGet("dropdown/{branchId}")]
        public async Task<IActionResult> GetDropdown(int branchId, [FromQuery] bool activeOnly = true)
        {
            var items = await _service.GetDropdownAsync(branchId, activeOnly);
            return Ok(new { Success = true, Items = items });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AgentMasterDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });
            var result = await _service.CreateAsync(dto);
            if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Agent added successfully." });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] AgentMasterDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });
            var result = await _service.UpdateAsync(dto);
            if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Agent updated successfully." });
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> Delete(int id, int branchId)
        {
            var result = await _service.DeleteAsync(id, branchId);
            if (result == "IN_USE") return Conflict(new { Success = false, InUse = true, Message = "This agent has accounts assigned and cannot be deleted." });
            if (result != "Success") return NotFound(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Agent deleted successfully." });
        }
    }
}
