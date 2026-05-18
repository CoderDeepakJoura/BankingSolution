using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MemberIntCertController : ControllerBase
    {
        private readonly MemberIntCertService _svc;
        public MemberIntCertController(MemberIntCertService svc) => _svc = svc;

        [HttpGet("search-members")]
        public async Task<IActionResult> SearchMembers([FromQuery] int branchId, [FromQuery] string query = "")
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            var (success, message, data) = await _svc.SearchMembersAsync(branchId, query);
            return Ok(new { success, message, data });
        }

        [HttpGet("members")]
        public async Task<IActionResult> GetAllMembers([FromQuery] int branchId)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            var (success, message, data) = await _svc.GetAllMembersAsync(branchId);
            return Ok(new { success, message, data });
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int branchId,
            [FromQuery] int memberId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate)
        {
            if (branchId <= 0) return BadRequest(new { success = false, message = "Invalid branch." });
            if (memberId <= 0) return BadRequest(new { success = false, message = "Invalid member." });
            if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                return BadRequest(new { success = false, message = "Invalid date format." });

            var (success, message, data) = await _svc.GetMemberIntCertAsync(branchId, memberId, from, to);
            return Ok(new { success, message, data });
        }
    }
}
