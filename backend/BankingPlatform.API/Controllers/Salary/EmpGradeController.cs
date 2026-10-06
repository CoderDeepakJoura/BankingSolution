using BankingPlatform.API.DTO.Salary;
using BankingPlatform.API.Service.Salary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Salary
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmpGradeController : ControllerBase
    {
        private readonly EmpGradeService _svc;
        public EmpGradeController(EmpGradeService svc) => _svc = svc;

        [HttpPost("get-all/{branchId}")]
        public async Task<IActionResult> GetAll(int branchId, [FromBody] SalaryFilterDTO filter)
        {
            var (items, total) = await _svc.GetAllAsync(branchId, filter.SearchTerm, filter.PageNumber, filter.PageSize);
            return Ok(new { success = true, items, totalCount = total });
        }

        [HttpGet("dropdown/{branchId}")]
        public async Task<IActionResult> Dropdown(int branchId) =>
            Ok(new { success = true, items = await _svc.GetDropdownAsync(branchId) });

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmpGradeDTO dto)
        {
            try
            {
                var msg = await _svc.CreateAsync(dto);
                return Ok(new { success = true, message = msg });
            }
            catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = ex.Message }); }
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] EmpGradeDTO dto)
        {
            try
            {
                var msg = await _svc.UpdateAsync(dto);
                return Ok(new { success = true, message = msg });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = ex.Message }); }
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> Delete(int id, int branchId)
        {
            try
            {
                var msg = await _svc.DeleteAsync(id, branchId);
                return Ok(new { success = true, message = msg });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = ex.Message }); }
        }
    }
}
