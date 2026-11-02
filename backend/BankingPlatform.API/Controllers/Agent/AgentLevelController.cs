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
    public class AgentLevelController : ControllerBase
    {
        private readonly AgentLevelService _service;
        public AgentLevelController(AgentLevelService service) => _service = service;

        [HttpPost("get-all/{branchId}")]
        public async Task<IActionResult> GetAll(int branchId, [FromBody] AgentFilterDTO filter)
        {
            try
            {
                var (items, total) = await _service.GetAllAsync(branchId, filter);
                return Ok(new { Success = true, Items = items, TotalCount = total });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpGet("dropdown/{branchId}")]
        public async Task<IActionResult> GetDropdown(int branchId)
        {
            try
            {
                var items = await _service.GetDropdownAsync(branchId);
                return Ok(new { Success = true, Items = items });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AgentLevelDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });
            try
            {
                var result = await _service.CreateAsync(dto);
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Agent level added successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] AgentLevelDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });
            try
            {
                var result = await _service.UpdateAsync(dto);
                if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Agent level updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> Delete(int id, int branchId)
        {
            try
            {
                var result = await _service.DeleteAsync(id, branchId);
                if (result == "IN_USE_PARENT") return Conflict(new { Success = false, InUse = true, Message = "This level is used as a parent by other levels and cannot be deleted." });
                if (result == "IN_USE") return Conflict(new { Success = false, InUse = true, Message = "This level is assigned to one or more agents and cannot be deleted." });
                if (result != "Success") return NotFound(new ResponseDto { Success = false, Message = result });
                return Ok(new ResponseDto { Success = true, Message = "Agent level deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }
    }
}
