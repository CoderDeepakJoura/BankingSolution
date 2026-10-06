using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Controllers.Salary
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeeTransferController : ControllerBase
    {
        private readonly BankingDbContext _db;
        public EmployeeTransferController(BankingDbContext db) => _db = db;

        [HttpPost]
        public async Task<IActionResult> Transfer([FromBody] EmployeeTransferDTO dto)
        {
            try
            {
                var emp = await _db.employeemaster
                    .FirstOrDefaultAsync(x => x.id == dto.EmpId && x.branchid == dto.FromBranchId);
                if (emp == null) return NotFound(new { Success = false, Message = "Employee not found." });

                var toBranch = await _db.branchmaster
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.id == dto.ToBranchId);
                if (toBranch == null) return BadRequest(new { Success = false, Message = "Destination branch not found." });

                emp.currentbranchid = dto.ToBranchId;
                await _db.SaveChangesAsync();

                return Ok(new { success = true, message = $"Employee transferred to {toBranch.branchmaster_name} successfully." });
            }
            catch (Exception ex) { return StatusCode(500, new { Success = false, Message = ex.Message }); }
        }
    }
}
