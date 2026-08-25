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
    public class EmployeeAttendanceController : ControllerBase
    {
        private readonly EmployeeAttendanceService _service;
        public EmployeeAttendanceController(EmployeeAttendanceService service) => _service = service;

        /// <summary>
        /// GET api/EmployeeAttendance/get/{branchId}?month=2025-09
        /// Returns all active employees with their attendance for the given month.
        /// Employees with no record yet have zero leave values.
        /// </summary>
        [HttpGet("get/{branchId}")]
        public async Task<IActionResult> Get(int branchId, [FromQuery] string month)
        {
            if (string.IsNullOrWhiteSpace(month))
                return BadRequest(new ResponseDto { Success = false, Message = "month query param required (YYYY-MM)." });

            var items = await _service.GetAttendanceAsync(branchId, month);
            return Ok(new { Success = true, Items = items });
        }

        /// <summary>
        /// POST api/EmployeeAttendance/save
        /// Upserts attendance records (insert or update) for all rows in the body.
        /// </summary>
        [HttpPost("save")]
        public async Task<IActionResult> Save([FromBody] SaveAttendanceDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ResponseDto { Success = false, Message = "Invalid data." });

            var result = await _service.SaveAttendanceAsync(dto);
            if (result != "Success")
                return BadRequest(new ResponseDto { Success = false, Message = result });

            return Ok(new ResponseDto { Success = true, Message = "Attendance saved successfully." });
        }
    }
}
