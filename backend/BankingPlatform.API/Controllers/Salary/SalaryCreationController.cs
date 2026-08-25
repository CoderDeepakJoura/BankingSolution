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
    public class SalaryCreationController : ControllerBase
    {
        private readonly SalaryCreationService _service;
        public SalaryCreationController(SalaryCreationService service) => _service = service;

        [HttpPost("fetch-employee-salary")]
        public async Task<IActionResult> FetchEmployeeSalary([FromBody] SalaryCreationRequestDTO req)
        {
            var result = await _service.GetSalaryCreationDataAsync(req);
            if (result == null) return NotFound(new ResponseDto { Success = false, Message = "Employee not found." });
            return Ok(new { Success = true, Data = result });
        }

        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] SaveMonthlySalaryDTO dto)
        {
            var result = await _service.SaveMonthlySalaryAsync(dto);
            if (result != "Success") return BadRequest(new ResponseDto { Success = false, Message = result });
            return Ok(new ResponseDto { Success = true, Message = "Monthly salary saved successfully." });
        }

        [HttpGet("history/{branchId}")]
        public async Task<IActionResult> GetHistory(int branchId)
        {
            var result = await _service.GetProcessedSalariesAsync(branchId);
            return Ok(new { Success = true, Items = result });
        }
    }
}
