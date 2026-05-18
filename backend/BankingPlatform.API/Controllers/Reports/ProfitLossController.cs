using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Service.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Reports
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfitLossController : ControllerBase
    {
        private readonly ProfitLossService _service;
        private readonly ILogger<ProfitLossController> _logger;
        private readonly CommonFunctions _cf;

        public ProfitLossController(ProfitLossService service, ILogger<ProfitLossController> logger, CommonFunctions cf)
        {
            _service = service;
            _logger  = logger;
            _cf      = cf;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfitLoss(
            [FromQuery] int branchId,
            [FromQuery] string fromDate,
            [FromQuery] string toDate)
        {
            try
            {
                if (!DateTime.TryParse(fromDate, out var from))
                    return BadRequest(new { Success = false, Message = "Invalid fromDate format." });

                if (!DateTime.TryParse(toDate, out var to))
                    return BadRequest(new { Success = false, Message = "Invalid toDate format." });

                if (from > to)
                    return BadRequest(new { Success = false, Message = "fromDate must be on or before toDate." });

                var (success, message, data) = await _service.GetProfitLossAsync(branchId, from, to);
                if (!success)
                    return BadRequest(new { Success = false, Message = message });

                return Ok(new { Success = true, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating profit & loss statement.");
                await _cf.LogErrors(ex, nameof(GetProfitLoss), nameof(ProfitLossController));
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }
    }
}
