using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Salary;
using BankingPlatform.API.Service.Salary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Salary
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeeMasterController : ControllerBase
    {
        private readonly EmployeeMasterService _service;
        public EmployeeMasterController(EmployeeMasterService service) => _service = service;

        [HttpPost("get-all/{branchId}")]
        public async Task<IActionResult> GetAll(int branchId, [FromBody] SalaryFilterDTO filter)
        {
            var (items, total) = await _service.GetAllAsync(branchId, filter);
            return Ok(new { Success = true, Items = items, TotalCount = total });
        }

        [HttpGet("dropdown/{branchId}")]
        public async Task<IActionResult> GetDropdown(int branchId)
        {
            var items = await _service.GetAllForDropdownAsync(branchId);
            return Ok(new { Success = true, Items = items });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmployeeMasterDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });
            var result = await _service.CreateAsync(dto);
            if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Employee added successfully." });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] EmployeeMasterDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });
            var result = await _service.UpdateAsync(dto);
            if (result != "Success") return NotFound(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Employee updated successfully." });
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> Delete(int id, int branchId)
        {
            var result = await _service.DeleteAsync(id, branchId);
            if (result != "Success") return NotFound(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Employee deleted successfully." });
        }
    }
}
