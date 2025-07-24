using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace BankingPlatform.API.Controllers
{
    // Consistent response model
    public class ResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string? Token { get; set; } // Optional for returning JWT
    }

    // Enhanced UserLoginDto with validation
    public class UserLoginDto
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; }

        [Required(ErrorMessage = "Password is required")]
        public string Password { get; set; }

        [Required(ErrorMessage = "Branch code is required")]
        public string BranchCode { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly JwtTokenService _jwtTokenService;
        private readonly ILogger<AuthController> _logger;
        private readonly JwtSettings _jwtSettings;

        public AuthController(
            BankingDbContext context,
            JwtTokenService jwtTokenService,
            ILogger<AuthController> logger,
            IOptions<JwtSettings> jwtOptions)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _jwtTokenService = jwtTokenService ?? throw new ArgumentNullException(nameof(jwtTokenService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _jwtSettings = jwtOptions?.Value ?? throw new ArgumentNullException(nameof(jwtOptions));
        }

        [HttpPost("login")]
        [EnableRateLimiting("Auth")] // Matches Program.cs policy
        public async Task<IActionResult> Login([FromBody] UserLoginDto loginDto)
        {
            try
            {
                // Validate model using data annotations
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Login attempt with invalid data: {Errors}", string.Join(", ", errors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", errors)
                    });
                }

                // Normalize inputs
                loginDto.Username = loginDto.Username.Trim();
                loginDto.BranchCode = loginDto.BranchCode.Trim();

                // Case-insensitive query (assumes PostgreSQL with ILike or Lower)
                var user = await _context.users
                    .SingleOrDefaultAsync(u =>
                        EF.Functions.ILike(u.branchcode, loginDto.BranchCode) &&
                        EF.Functions.ILike(u.username, loginDto.Username));

                if (user == null)
                {
                    _logger.LogWarning("Failed login attempt - user not found: {Username}, branch: {BranchCode}",
                        loginDto.Username, loginDto.BranchCode);
                    return Unauthorized(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid credentials"
                    });
                }

                bool isPasswordValid = PasswordHasher.VerifyPassword(loginDto.Password, user.password);
                if (!isPasswordValid)
                {
                    _logger.LogWarning("Failed login attempt - invalid password for user: {Username}, branch: {BranchCode}",
                        loginDto.Username, loginDto.BranchCode);
                    return Unauthorized(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid credentials"
                    });
                }

                // Generate token
                var tokenExpiration = DateTime.UtcNow.AddDays(_jwtSettings.ExpiryDays);
                var token = _jwtTokenService.GenerateToken(user.id.ToString(), user.username, user.branchcode);

                // Set cookie *before* writing response body
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, // HTTPS in prod
                    SameSite = SameSiteMode.None, // Strict for CSRF protection
                    Path = "/",
                    Expires = tokenExpiration
                };
                Response.Cookies.Append("AuthToken", token, cookieOptions);

                _logger.LogInformation("Successful login for user: {Username}, branch: {BranchCode}",
                    loginDto.Username, loginDto.BranchCode);

                // Return response with optional token
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Login successful",
                    Token = token // Include token for clients that need it
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login for user: {Username}, branch: {BranchCode}",
                    loginDto?.Username ?? "unknown", loginDto?.BranchCode ?? "unknown");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            try
            {
                // Check if cookie exists before deleting
                if (Request.Cookies.ContainsKey("AuthToken"))
                {
                    Response.Cookies.Delete("AuthToken");
                    _logger.LogInformation("User logged out successfully");
                }
                else
                {
                    _logger.LogWarning("Logout attempted but no AuthToken cookie found");
                }

                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Logged out successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred during logout"
                });
            }
        }

        [Authorize]
        [HttpGet("validate_token")]
        public async Task<IActionResult> ValidateToken()
        {
            return Ok(new ResponseDto
            {
                Success = true
            });
        }
    }
}