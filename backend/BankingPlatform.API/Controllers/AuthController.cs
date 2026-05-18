using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Controllers.Member;
using BankingPlatform.API.Controllers.ProductMasters;
using BankingPlatform.API.DTO.WorkingDate;
using BankingPlatform.Common.Common.CommonClasses;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Auth;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Settings;
using System.Diagnostics;
using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using System.Transactions;

namespace BankingPlatform.API.Controllers
{
    // Consistent response model
    public class ResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = ""!;
    }

    // Enhanced UserLoginDto with validation
    public class UserLoginDto
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; } = ""!;

        [Required(ErrorMessage = "Password is required")]
        public string Password { get; set; } = ""!;

        [Required(ErrorMessage = "Branch code is required")]
        public string BranchCode { get; set; } = ""!;
    }

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly JwtTokenService _jwtTokenService;
        private readonly ILogger<AuthController> _logger;
        private readonly JwtSettings _jwtSettings;
        private readonly CommonFunctions _commonFns;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private CommonClass _commonClass;
        private ScriptPath _scriptPath;

        public AuthController(
            BankingDbContext context,
            JwtTokenService jwtTokenService,
            ILogger<AuthController> logger,
            IOptions<JwtSettings> jwtOptions,
            CommonFunctions commonFunctions,
            CommonClass commonClass,
            IHttpContextAccessor httpContextAccessor,
            IOptions<ScriptPath> scriptPath)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _jwtTokenService = jwtTokenService ?? throw new ArgumentNullException(nameof(jwtTokenService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _jwtSettings = jwtOptions?.Value ?? throw new ArgumentNullException(nameof(jwtOptions));
            _commonFns = commonFunctions ?? throw new ArgumentNullException(nameof(_commonFns));
            _commonClass = commonClass ?? throw new ArgumentNullException(nameof(_commonClass));
            _httpContextAccessor = httpContextAccessor;
            _scriptPath = scriptPath.Value;
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

                branchMaster? branchInfo = await _commonFns.GetBranchInfoFromBranchCodeAsync(loginDto.BranchCode);
                if (branchInfo == null)
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Please enter valid Branch Code."
                    });


                var user = await _context.user
                    .SingleOrDefaultAsync(u =>
                        u.branchid == branchInfo.id &&
                        EF.Functions.ILike(u.username, loginDto.Username));

                if (user == null)
                {
                    _logger.LogWarning("Failed login attempt - user not found: {Username}, branch: {BranchCode}",
                        loginDto.Username, loginDto.BranchCode);
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid credentials." });
                }

                if (user.isauthorized == 0)
                {
                    _logger.LogWarning("Login attempt by unauthorised user: {Username}, branch: {BranchCode}",
                        loginDto.Username, loginDto.BranchCode);
                    return Unauthorized(new ResponseDto { Success = false, Message = "User is not authorized to login." });
                }

                bool isPasswordValid = PasswordHasher.VerifyPassword(loginDto.Password, user.password);
                if (!isPasswordValid)
                {
                    _logger.LogWarning("Failed login attempt - wrong password for user: {Username}, branch: {BranchCode}",
                        loginDto.Username, loginDto.BranchCode);
                    return BadRequest(new ResponseDto { Success = false, Message = "Invalid credentials." });
                }

                setClaims(user.username, branchInfo.branchmaster_name, branchInfo.branchmaster_code, branchInfo.id, "", branchInfo.branchmaster_phoneno1, branchInfo.branchmaster_addressline, branchInfo.branchmaster_emailid, user.id.ToString(), "", "", 0, false, user.issu == 1);

                // Short-lived JWT forces working-date selection before full session is granted
                var tokenExpiration = DateTime.UtcNow.AddMinutes(5);
                var token = _jwtTokenService.GenerateToken(tokenExpiration);

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None,
                    Path = "/",
                    Expires = tokenExpiration
                };
                Response.Cookies.Append("AuthToken", token, cookieOptions);

                // Issue refresh token (long-lived, stored in DB)
                var refreshToken = await CreateRefreshTokenAsync(user.id, branchInfo.id);
                Response.Cookies.Append("RefreshToken", refreshToken, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None,
                    Path = "/api/auth",   // only sent to auth endpoints
                    Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
                });

                _logger.LogInformation("Successful login for user: {Username}, branch: {BranchCode}",
                    loginDto.Username, loginDto.BranchCode);

                // Return response with optional token
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Login successful"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login for user: {Username}, branch: {BranchCode}",
                    loginDto?.Username ?? "unknown", loginDto?.BranchCode ?? "unknown");
                await _commonFns.LogErrors(ex, nameof(Login), "AuthController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An unexpected error occurred"
                });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                // Revoke refresh token in DB
                var rawRefreshToken = Request.Cookies["RefreshToken"];
                if (!string.IsNullOrEmpty(rawRefreshToken))
                {
                    var stored = await _context.refreshtoken
                        .FirstOrDefaultAsync(r => r.Token == rawRefreshToken && !r.IsRevoked);
                    if (stored != null)
                    {
                        stored.IsRevoked = true;
                        await _context.SaveChangesAsync();
                    }
                    Response.Cookies.Delete("RefreshToken", new CookieOptions
                    {
                        HttpOnly = true, Secure = true, SameSite = SameSiteMode.None, Path = "/api/auth"
                    });
                }

                if (Request.Cookies.ContainsKey("AuthToken"))
                {
                    Response.Cookies.Delete("AuthToken", new CookieOptions
                    {
                        Path = "/", HttpOnly = true, Secure = true, SameSite = SameSiteMode.None
                    });
                    _logger.LogInformation("User logged out successfully");
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
                await _commonFns.LogErrors(ex, nameof(Logout), "AuthController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred during logout"
                });
            }
        }
        [Authorize]
        [HttpPost("working-date")]
        public async Task<IActionResult> SetWorkingDate([FromBody] WorkingDateDTO workingDateDTO)
        {
            try
            {
                GetClaims(out string userName, out string branchName, out string branchCode, out int branchId, out string societyName, out string contact, out string address, out string email, out string userId, out string workingDate, out string sessionInfo, out int sessionId, out bool isFirstSession, out bool isSu, out string _, out string __);
                string[] sessionArry = workingDateDTO.sessionInfo.Split('-');
                (int sessionFromYear, int sessionToYear) = (Convert.ToInt32(sessionArry[0]), Convert.ToInt32(sessionArry[1]));
                isFirstSession = await _commonFns.IsFirstSession(sessionFromYear, sessionToYear);

                var selectedSession = await _context.branchsession.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.id == workingDateDTO.sessionId && x.branchid == branchId);
                var sessionFromDate = selectedSession?.fromdate.ToString("yyyy-MM-dd") ?? "";
                var sessionToDate   = selectedSession?.todate.ToString("yyyy-MM-dd") ?? "";

                setClaims(userName, branchName, branchCode, branchId, societyName, contact, address, email, userId, workingDateDTO.WorkingDate, workingDateDTO.sessionInfo, workingDateDTO.sessionId, isFirstSession, isSu, sessionFromDate, sessionToDate);

                var tokenExpiration = DateTime.UtcNow.AddDays(_jwtSettings.ExpiryDays);
                var token = _jwtTokenService.GenerateToken(tokenExpiration);

                var baseCookieOpts = new CookieOptions { HttpOnly = true, Secure = true, SameSite = SameSiteMode.None, Path = "/" };
                if (Request.Cookies.ContainsKey("AuthToken"))
                    Response.Cookies.Delete("AuthToken", baseCookieOpts);

                Response.Cookies.Append("AuthToken", token, new CookieOptions
                {
                    HttpOnly = true, Secure = true, SameSite = SameSiteMode.None,
                    Path = "/", Expires = tokenExpiration
                });

                // Rotate refresh token — revoke old, issue new with updated claims snapshot
                await RotateRefreshTokenAsync(Request.Cookies["RefreshToken"], int.Parse(userId), branchId);
                var newRefreshToken = await CreateRefreshTokenAsync(int.Parse(userId), branchId);
                Response.Cookies.Append("RefreshToken", newRefreshToken, new CookieOptions
                {
                    HttpOnly = true, Secure = true, SameSite = SameSiteMode.None,
                    Path = "/api/auth",
                    Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
                });
                var date = DateTime.ParseExact(
                    workingDateDTO.WorkingDate,
                    "dd-MMMM-yyyy",               // Matches "03-September-2025"
                    CultureInfo.InvariantCulture  // Ensures it works regardless of system locale
                ).ToUniversalTime();

                using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    var dayInfo = new DayBeginEndInfo
                    {
                        branchid = branchId,
                        workingdate = date,
                        lateststatus = (int)Enums.DayStatus.Begin,
                    };

                    _context.daybeginendinfo.Add(dayInfo);
                    await _context.SaveChangesAsync();

                    var detail = new DayBeginEndInfoDetail
                    {
                        branchid = branchId,
                        entrydatetime = date,
                        status = (int)Enums.DayStatus.Begin,
                        daybeginendinfoid = dayInfo.id,
                        userid = int.Parse(userId)
                    };

                    _context.daybeginendinfodetail.Add(detail);
                    await _context.SaveChangesAsync();

                    scope.Complete();
                }



                // Return response with optional token
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Working Date set successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while setting Working Date");
                await _commonFns.LogErrors(ex, nameof(SetWorkingDate), "AuthController");
                return StatusCode(500, new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while setting working date"
                });
            }
        }
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetLoginInfo()
        {
            GetClaims(out string userName, out string branchName, out string branchCode, out int branchId, out string societyName, out string contact, out string address, out string email, out string userId, out string workingDate, out string sessionInfo, out int sessionId, out bool isFirstSession, out bool isSu, out string _, out string __);

            // Always fetch isSu from DB — JWT may predate when the claim was added
            if (int.TryParse(userId, out int parsedUserId) && parsedUserId > 0)
            {
                var user = await _context.user.FirstOrDefaultAsync(u => u.id == parsedUserId && u.branchid == branchId);
                if (user != null)
                    isSu = user.issu == 1;
            }

            var (firstSessionFromDate, firstSessionToDate) = await _commonFns.FirstSessionFromDateAndToDate(branchId);

            var currentSession = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            return Ok(new
            {
                Success = true,
                UserName = userName,
                BranchCode = branchCode,
                BranchId = branchId,
                BranchName = branchName,
                SocietyName = societyName,
                Contact = contact,
                Address = address,
                Email = email,
                WorkingDate = workingDate,
                SessionInfo = sessionInfo,
                SessionId = sessionId,
                IsFirstSession = isFirstSession,
                FirstSessionFromDate = firstSessionFromDate,
                FirstSessionToDate = firstSessionToDate,
                SessionFromDate = currentSession?.fromdate ?? DateTime.MinValue,
                SessionToDate = currentSession?.todate ?? DateTime.MinValue,
                IsSu = isSu
            });
        }

        [Authorize]
        [HttpPost("run-script")]
        public async Task<IActionResult> RunSeleniumScript()
        {
            try
            {
                string scriptPath;
                ProcessStartInfo processInfo;
                string logPath;

                // Detect OS and configure accordingly
                if (OperatingSystem.IsWindows())
                {
                    // Windows: Use .bat file
                    scriptPath = Path.Combine(_scriptPath.LoanAdvancement, "run_loan_automation.bat");
                    processInfo = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = $"/c \"{scriptPath}\"",
                        WorkingDirectory = _scriptPath.LoanAdvancement,
                        UseShellExecute = true,
                        CreateNoWindow = false
                    };
                }
                else
                {
                    scriptPath = Path.Combine(_scriptPath.LoanAdvancement, "run_loan_automation.sh");
                    logPath = Path.Combine(_scriptPath.LoanAdvancement, $"logs/api_run_{DateTime.Now:yyyyMMdd_HHmmss}.log");

                    _logger?.LogInformation($"Script path: {scriptPath}");
                    _logger?.LogInformation($"Log path: {logPath}");

                    if (!System.IO.File.Exists(scriptPath))
                    {
                        return StatusCode(500, new
                        {
                            success = false,
                            error = $"Script not found: {scriptPath}"
                        });
                    }

                    // Ensure logs directory exists
                    var logsDir = Path.Combine(_scriptPath.LoanAdvancement, "logs");
                    if (!Directory.Exists(logsDir))
                    {
                        Directory.CreateDirectory(logsDir);
                    }

                    // Make executable
                    try
                    {
                        var chmodInfo = new ProcessStartInfo
                        {
                            FileName = "/bin/chmod",
                            Arguments = $"+x {scriptPath}",
                            UseShellExecute = false,
                            CreateNoWindow = true
                        };
                        Process.Start(chmodInfo)?.WaitForExit();
                    }
                    catch { }

                    // Use bash -c with nohup and background execution
                    // This ensures the process truly runs in background
                    var bashCommand = $"cd {_scriptPath.LoanAdvancement} && nohup {scriptPath} > {logPath} 2>&1 & echo $!";

                    processInfo = new ProcessStartInfo
                    {
                        FileName = "/bin/bash",
                        Arguments = $"-c \"{bashCommand}\"",
                        WorkingDirectory = _scriptPath.LoanAdvancement,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };

                    //// Set environment variables (as backup)
                    //processInfo.Environment["DISPLAY"] = ":1";
                    //processInfo.Environment["HOME"] = Environment.GetEnvironmentVariable("HOME") ?? "/root";
                }

                var process = Process.Start(processInfo);

                if (process == null)
                {
                    return StatusCode(500, new { success = false, error = "Failed to start process" });
                }

                // 🎯 KEY FIX: Return immediately, don't wait for completion
                // The script runs in background

                // Optional: Log PID for tracking
                int pid = process.Id;

                // Optional: Read initial output in background (don't await)
                if (!OperatingSystem.IsWindows())
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            string output = await process.StandardOutput.ReadToEndAsync();
                            string error = await process.StandardError.ReadToEndAsync();

                            // Log output/errors for debugging
                            Console.WriteLine($"[Automation PID:{pid}] Output: {output}");
                            if (!string.IsNullOrEmpty(error))
                            {
                                Console.WriteLine($"[Automation PID:{pid}] Error: {error}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[Automation PID:{pid}] Logging error: {ex.Message}");
                        }
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Loan automation started successfully",
                    pid = pid // Return process ID for tracking
                });
            }
            catch (Exception ex)
            {
                await _commonFns.LogErrors(ex, nameof(RunSeleniumScript), nameof(AuthController));
                _logger.LogError(ex, "Error starting loan automation script.");
                return StatusCode(500, new { success = false, error = "Script execution failed." });
            }
        }



        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            try
            {
                var rawToken = Request.Cookies["RefreshToken"];
                if (string.IsNullOrEmpty(rawToken))
                    return Unauthorized(new ResponseDto { Success = false, Message = "Refresh token not found." });

                var stored = await _context.refreshtoken
                    .FirstOrDefaultAsync(r => r.Token == rawToken && !r.IsRevoked);

                if (stored == null)
                    return Unauthorized(new ResponseDto { Success = false, Message = "Invalid or revoked refresh token." });

                if (stored.ExpiresAt < DateTime.UtcNow)
                {
                    stored.IsRevoked = true;
                    await _context.SaveChangesAsync();
                    return Unauthorized(new ResponseDto { Success = false, Message = "Refresh token has expired. Please log in again." });
                }

                // Restore session claims from snapshot
                var snapshot = JsonSerializer.Deserialize<RefreshClaimsSnapshot>(stored.ClaimsSnapshot)
                    ?? throw new InvalidOperationException("Failed to deserialize claims snapshot.");

                setClaims(snapshot.UserName, snapshot.BranchName, snapshot.BranchCode, snapshot.BranchId,
                    snapshot.SocietyName, snapshot.ContactNo, snapshot.Address, snapshot.Email,
                    snapshot.UserId, snapshot.WorkingDate, snapshot.SessionInfo, snapshot.SessionId, snapshot.IsFirstSession, snapshot.IsSu,
                    snapshot.SessionFromDate, snapshot.SessionToDate);

                var tokenExpiration = DateTime.UtcNow.AddDays(_jwtSettings.ExpiryDays);
                var newJwt = _jwtTokenService.GenerateToken(tokenExpiration);

                // Rotate: revoke old refresh token, issue new one
                stored.IsRevoked = true;
                var newRefreshRaw = JwtTokenService.GenerateRefreshToken();
                stored.ReplacedByToken = newRefreshRaw;

                await _context.refreshtoken.AddAsync(new RefreshToken
                {
                    Token = newRefreshRaw,
                    UserId = stored.UserId,
                    BranchId = stored.BranchId,
                    ClaimsSnapshot = stored.ClaimsSnapshot,
                    ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                    IsRevoked = false,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                Response.Cookies.Append("AuthToken", newJwt, new CookieOptions
                {
                    HttpOnly = true, Secure = true, SameSite = SameSiteMode.None,
                    Path = "/", Expires = tokenExpiration
                });
                Response.Cookies.Append("RefreshToken", newRefreshRaw, new CookieOptions
                {
                    HttpOnly = true, Secure = true, SameSite = SameSiteMode.None,
                    Path = "/api/auth", Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
                });

                _logger.LogInformation("Token refreshed for user: {UserId}, branch: {BranchId}", stored.UserId, stored.BranchId);
                return Ok(new ResponseDto { Success = true, Message = "Token refreshed successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh.");
                await _commonFns.LogErrors(ex, nameof(Refresh), "AuthController");
                return StatusCode(500, new ResponseDto { Success = false, Message = "An unexpected error occurred." });
            }
        }

        private async Task<string> CreateRefreshTokenAsync(int userId, int branchId)
        {
            // Purge expired tokens for this user to keep the table clean
            var expired = await _context.refreshtoken
                .Where(r => r.UserId == userId && r.BranchId == branchId && r.ExpiresAt < DateTime.UtcNow)
                .ToListAsync();
            if (expired.Any())
            {
                _context.refreshtoken.RemoveRange(expired);
            }

            var raw = JwtTokenService.GenerateRefreshToken();
            var snapshot = JsonSerializer.Serialize(new RefreshClaimsSnapshot
            {
                UserName = _commonClass.userName,
                BranchCode = _commonClass.branchCode,
                BranchId = _commonClass.branchId,
                BranchName = _commonClass.branchName,
                SocietyName = _commonClass.societyName,
                ContactNo = _commonClass.contactno,
                Address = _commonClass.address,
                Email = _commonClass.email,
                UserId = _commonClass.userId,
                WorkingDate = _commonClass.workingDate,
                SessionInfo = _commonClass.sessionInfo,
                SessionId = _commonClass.sessionId,
                IsFirstSession = _commonClass.isFirstSession,
                IsSu = _commonClass.isSu,
                SessionFromDate = _commonClass.sessionFromDate,
                SessionToDate = _commonClass.sessionToDate
            });

            await _context.refreshtoken.AddAsync(new RefreshToken
            {
                Token = raw,
                UserId = userId,
                BranchId = branchId,
                ClaimsSnapshot = snapshot,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            return raw;
        }

        private async Task RotateRefreshTokenAsync(string? rawToken, int userId, int branchId)
        {
            if (string.IsNullOrEmpty(rawToken)) return;
            var stored = await _context.refreshtoken
                .FirstOrDefaultAsync(r => r.Token == rawToken && r.UserId == userId && r.BranchId == branchId && !r.IsRevoked);
            if (stored != null)
            {
                stored.IsRevoked = true;
                await _context.SaveChangesAsync();
            }
        }

        private void GetClaims(out string userName, out string branchName, out string branchCode, out int branchId, out string societyName, out string contact, out string address, out string email, out string userId, out string workingDate, out string sessionInfo, out int sessionId, out bool isFirstSession, out bool isSu, out string sessionFromDate, out string sessionToDate)
        {
            var principal = _httpContextAccessor.HttpContext?.User
                ?? throw new InvalidOperationException("No authenticated user in context.");

            userName     = principal.FindFirst(ClaimTypes.Name)?.Value ?? "";
            branchCode   = principal.FindFirst("branchCode")?.Value ?? "";
            branchName   = principal.FindFirst("branchName")?.Value ?? "";
            societyName  = principal.FindFirst("societyName")?.Value ?? "";
            contact      = principal.FindFirst("contactNo")?.Value ?? "";
            address      = principal.FindFirst("address")?.Value ?? "";
            email        = principal.FindFirst("emailaddress")?.Value ?? "";
            userId       = principal.FindFirst("userId")?.Value ?? "";
            workingDate  = principal.FindFirst("workingDate")?.Value ?? "";
            sessionInfo  = principal.FindFirst("sessionInfo")?.Value ?? "";
            sessionFromDate = principal.FindFirst("sessionFromDate")?.Value ?? "";
            sessionToDate   = principal.FindFirst("sessionToDate")?.Value ?? "";

            int.TryParse(principal.FindFirst("branchId")?.Value, out branchId);
            int.TryParse(principal.FindFirst("sessionId")?.Value, out sessionId);
            bool.TryParse(principal.FindFirst("isFirstSession")?.Value, out isFirstSession);
            bool.TryParse(principal.FindFirst("isSu")?.Value, out isSu);
        }

        private void setClaims(string userName, string branchName, string branchCode, int branchId, string societyName, string contact, string address, string email, string userId, string workingDate, string sessionInfo, int sessionId, bool isFirstSession, bool isSu, string sessionFromDate = "", string sessionToDate = "")
        {
            _commonClass.branchCode = branchCode;
            _commonClass.branchId = branchId;
            _commonClass.branchName = branchName;
            _commonClass.userName = userName;
            _commonClass.societyName = societyName;
            _commonClass.address = address;
            _commonClass.email = email;
            _commonClass.contactno = contact;
            _commonClass.userId = userId;
            _commonClass.workingDate = workingDate;
            _commonClass.sessionInfo = sessionInfo;
            _commonClass.sessionId = sessionId;
            _commonClass.isFirstSession = isFirstSession;
            _commonClass.isSu = isSu;
            _commonClass.sessionFromDate = sessionFromDate;
            _commonClass.sessionToDate = sessionToDate;
        }
    }
    public class ScriptPath
    {
        public string LoanAdvancement { get; set; } = ""!;
    }

    public class RefreshClaimsSnapshot
    {
        public string UserName { get; set; } = "";
        public string BranchCode { get; set; } = "";
        public int BranchId { get; set; }
        public string BranchName { get; set; } = "";
        public string SocietyName { get; set; } = "";
        public string ContactNo { get; set; } = "";
        public string Address { get; set; } = "";
        public string Email { get; set; } = "";
        public string UserId { get; set; } = "";
        public string WorkingDate { get; set; } = "";
        public string SessionInfo { get; set; } = "";
        public int SessionId { get; set; }
        public bool IsFirstSession { get; set; }
        public bool IsSu { get; set; }
        public string SessionFromDate { get; set; } = "";
        public string SessionToDate { get; set; } = "";
    }
}
