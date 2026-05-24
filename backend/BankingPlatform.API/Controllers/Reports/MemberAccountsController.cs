using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MemberAccountsController : ControllerBase
    {
        private readonly MemberAccountsService _service;
        private readonly ILogger<MemberAccountsController> _logger;
        private readonly CommonFunctions _cf;

        public MemberAccountsController(MemberAccountsService service, ILogger<MemberAccountsController> logger, CommonFunctions cf)
        {
            _service = service;
            _logger  = logger;
            _cf      = cf;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] int branchId, [FromQuery] string searchTerm = "")
        {
            try
            {
                var (success, message, data) = await _service.SearchMembersAsync(branchId, searchTerm);
                return Ok(new { Success = success, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching members.");
                await _cf.LogErrors(ex, nameof(Search), nameof(MemberAccountsController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        [HttpGet("detail")]
        public async Task<IActionResult> GetDetail(
            [FromQuery] int branchId,
            [FromQuery] int memberId,
            [FromQuery] string asOnDate = "")
        {
            try
            {
                if (!DateTime.TryParse(asOnDate, out var date))
                    date = DateTime.Today;

                var (success, message, data) = await _service.GetMemberAccountsDetailAsync(branchId, memberId, date);
                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching member accounts detail.");
                await _cf.LogErrors(ex, nameof(GetDetail), nameof(MemberAccountsController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
