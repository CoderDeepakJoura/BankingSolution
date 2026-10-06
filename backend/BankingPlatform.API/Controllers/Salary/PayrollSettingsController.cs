using BankingPlatform.API.DTO.Salary;
using BankingPlatform.API.Service.Salary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Salary
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PayrollSettingsController : ControllerBase
    {
        private readonly PayrollSettingsService _svc;
        public PayrollSettingsController(PayrollSettingsService svc) => _svc = svc;

        [HttpGet("{branchId}")]
        public async Task<IActionResult> Get(int branchId)
        {
            var result = await _svc.GetByBranchAsync(branchId);
            return Ok(new { success = true, data = result });
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] PayrollSettingsDTO dto)
        {
            try
            {
                var msg = await _svc.SaveAsync(dto);
                return Ok(new { success = true, message = msg });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
