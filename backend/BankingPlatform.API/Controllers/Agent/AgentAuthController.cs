using BankingPlatform.API.DTO.Agent;
using BankingPlatform.API.Service.Agent;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BankingPlatform.API.Controllers.Agent
{
    [ApiController]
    [Route("api/agentauth")]
    [EnableRateLimiting("Auth")]
    public class AgentAuthController : ControllerBase
    {
        private readonly AgentAuthService _authService;

        public AgentAuthController(AgentAuthService authService) => _authService = authService;

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AgentLoginRequestDTO dto)
        {
            try
            {
                var (error, token) = await _authService.LoginAsync(dto);
                if (!string.IsNullOrEmpty(error))
                    return Unauthorized(new { message = error });
                return Ok(token);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Login failed due to a server error. Please contact support.", detail = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] AgentRefreshRequestDTO dto)
        {
            try
            {
                var (error, token) = await _authService.RefreshAsync(dto);
                if (!string.IsNullOrEmpty(error))
                    return Unauthorized(new { message = error });
                return Ok(token);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Token refresh failed. Please log in again.", detail = ex.Message });
            }
        }

        [HttpPost("revoke/{agentLoginId:int}")]
        public async Task<IActionResult> Revoke(int agentLoginId)
        {
            await _authService.RevokeAsync(agentLoginId);
            return Ok(new { message = "Token revoked." });
        }
    }
}
