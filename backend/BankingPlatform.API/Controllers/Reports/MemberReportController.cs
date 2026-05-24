using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MemberReportController : ControllerBase
    {
        private readonly MemberReportService _service;
        private readonly ILogger<MemberReportController> _logger;
        private readonly CommonFunctions _cf;

        public MemberReportController(MemberReportService service, ILogger<MemberReportController> logger, CommonFunctions cf)
        {
            _service = service;
            _logger  = logger;
            _cf      = cf;
        }

        [HttpGet]
        public async Task<IActionResult> GetMemberReport(
            [FromQuery] int branchId,
            [FromQuery] int memberType     = 0,
            [FromQuery] int villageId      = 0,
            [FromQuery] int gender         = 0,
            [FromQuery] string fromDate    = "",
            [FromQuery] string toDate      = "",
            [FromQuery] int memberStatus   = 0,
            [FromQuery] decimal fromAmount = 0,
            [FromQuery] decimal toAmount   = 0,
            [FromQuery] int postOfficeId   = 0)
        {
            try
            {
                if (!DateTime.TryParse(fromDate, out var from))
                    return BadRequest(new { Success = false, Message = "Invalid fromDate format." });
                if (!DateTime.TryParse(toDate, out var to))
                    return BadRequest(new { Success = false, Message = "Invalid toDate format." });
                if (from > to)
                    return BadRequest(new { Success = false, Message = "fromDate must be on or before toDate." });

                var (success, message, data) = await _service.GetMemberReportAsync(
                    branchId, memberType, villageId, gender,
                    from, to, memberStatus, fromAmount, toAmount, postOfficeId);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating member report.");
                await _cf.LogErrors(ex, nameof(GetMemberReport), nameof(MemberReportController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
