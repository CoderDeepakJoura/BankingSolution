using BankingPlatform.API.Service.MemberPortal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BankingPlatform.API.Controllers.MemberPortal
{
    [Route("api/[controller]")]
    [ApiController]
    public class MemberPortalController : ControllerBase
    {
        private readonly MemberPortalService _service;
        private readonly ILogger<MemberPortalController> _logger;

        public MemberPortalController(MemberPortalService service, ILogger<MemberPortalController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] MemberLoginDto dto)
        {
            try
            {
                var (success, message, token) = await _service.LoginAsync(dto);
                if (!success)
                    return Unauthorized(new { Success = false, Message = message });
                return Ok(new { Success = true, Message = message, Data = token });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MemberPortal login error.");
                return BadRequest(new { Success = false, Message = "An error occurred during login." });
            }
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var (memberId, branchId) = GetMemberClaims();
                if (memberId == 0) return Unauthorized(new { Success = false, Message = "Invalid token." });

                var (success, message, profile) = await _service.GetProfileAsync(memberId, branchId);
                if (!success)
                    return BadRequest(new { Success = false, Message = message });
                return Ok(new { Success = true, Message = message, Data = profile });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MemberPortal profile error.");
                return BadRequest(new { Success = false, Message = "An error occurred." });
            }
        }

        [HttpGet("ledger")]
        [Authorize]
        public async Task<IActionResult> GetLedger(
            [FromQuery] int accountId,
            [FromQuery] string accountType,
            [FromQuery] string fromDate,
            [FromQuery] string toDate,
            [FromQuery] int? fdDetailId = null)
        {
            try
            {
                var (memberId, branchId) = GetMemberClaims();
                if (memberId == 0) return Unauthorized(new { Success = false, Message = "Invalid token." });

                var (success, message, data) = await _service.GetLedgerAsync(
                    memberId, branchId, accountId, accountType, fromDate, toDate, fdDetailId);

                if (!success)
                    return BadRequest(new { Success = false, Message = message });
                return Ok(new { Success = true, Message = message, Data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MemberPortal ledger error.");
                return BadRequest(new { Success = false, Message = "An error occurred fetching the ledger." });
            }
        }

        private (int memberId, int branchId) GetMemberClaims()
        {
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            var branchIdClaim = User.FindFirst("branchId")?.Value;
            int.TryParse(memberIdClaim, out int memberId);
            int.TryParse(branchIdClaim, out int branchId);
            return (memberId, branchId);
        }
    }
}
