using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.Controllers.Member;
using BankingPlatform.API.Controllers.ProductMasters;
using BankingPlatform.API.DTO.WorkingDate;
using BankingPlatform.Common.Common.CommonClasses;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Security.Claims;
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
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Please enter valid User Name."
                    });
                }
                else if (user.isauthorized == 0)
                {
                    return Unauthorized(new ResponseDto
                    {
                        Success = false,
                        Message = "User is not authorized to login."
                    });
                }

                    
                bool isPasswordValid = PasswordHasher.VerifyPassword(loginDto.Password, user.password);
                if (!isPasswordValid)
                {
                    _logger.LogWarning("Failed login attempt - invalid password for user: {Username}, branch: {BranchCode}",
                        loginDto.Username, loginDto.BranchCode);
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Please enter valid Password."
                    });
                }

                setClaims(user.username, branchInfo.branchmaster_name, branchInfo.branchmaster_code, branchInfo.id, "", branchInfo.branchmaster_phoneno1, branchInfo.branchmaster_addressline, branchInfo.branchmaster_emailid, user.id.ToString(), "", "", 0, false);


                // Generate token
                var tokenExpiration = DateTime.UtcNow.AddMinutes(5);
                var token = _jwtTokenService.GenerateToken();

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
                // Check if cookie exists before deleting
                if (Request.Cookies.ContainsKey("AuthToken"))
                {
                    var cookieOptions = new CookieOptions
                    {
                        Path = "/",                  // must match
                        HttpOnly = true,             // must match
                        Secure = true,               // must match
                        SameSite = SameSiteMode.None // must match

                    };
                    Response.Cookies.Delete("AuthToken", cookieOptions);
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
                GetClaims(out string userName, out string branchName, out string branchCode, out int branchId, out string societyName, out string contact, out string address, out string email, out string userId, out string workingDate, out string sessionInfo, out int sessionId, out bool isFirstSession);
                string[] sessionArry = workingDateDTO.sessionInfo.Split('-');
                (int sessionFromYear, int sessionToYear) = (Convert.ToInt32(sessionArry[0]), Convert.ToInt32(sessionArry[1]));
                isFirstSession = await _commonFns.IsFirstSession(sessionFromYear, sessionToYear);
                setClaims(userName, branchName, branchCode, branchId, societyName, contact, address, email, userId, workingDateDTO.WorkingDate, workingDateDTO.sessionInfo, workingDateDTO.sessionId, isFirstSession);
                var tokenExpiration = DateTime.UtcNow.AddDays(_jwtSettings.ExpiryDays);
                var token = _jwtTokenService.GenerateToken();
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, // HTTPS in prod
                    SameSite = SameSiteMode.None, // Strict for CSRF protection
                    Path = "/"
                };
                if (Request.Cookies.ContainsKey("AuthToken"))
                {
                    Response.Cookies.Delete("AuthToken", cookieOptions);
                    _logger.LogInformation("User logged out successfully");
                }
                cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, // HTTPS in prod
                    SameSite = SameSiteMode.None, // Strict for CSRF protection
                    Path = "/",
                    Expires = tokenExpiration
                };
                Response.Cookies.Append("AuthToken", token, cookieOptions);
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
            GetClaims(out string userName, out string branchName, out string branchCode, out int branchId, out string societyName, out string contact, out string address, out string email, out string userId, out string workingDate, out string sessionInfo, out int sessionId, out bool isFirstSession);

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
                IsFirstSession = isFirstSession
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
                return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
            }
        }



        private void GetClaims(out string userName, out string branchName, out string branchCode, out int branchId, out string societyName, out string contact, out string address, out string email, out string userId, out string workingDate, out string sessionInfo, out int sessionId, out bool isFirstSession)
        {
            var user = _httpContextAccessor.HttpContext!.User!;

            userName = user.FindFirst(ClaimTypes.Name)?.Value!;
            branchCode = user.FindFirst("branchCode")?.Value!;
            branchId = Int32.Parse(user.FindFirst("branchId")?.Value!);
            branchName = user.FindFirst("branchName")?.Value!;
            societyName = user.FindFirst("societyName")?.Value!;
            contact = user.FindFirst("contactNo")?.Value!;
            address = user.FindFirst("address")?.Value!;
            email = user.FindFirst("emailaddress")?.Value!;
            userId = user.FindFirst("userId")?.Value!;
            workingDate = user.FindFirst("workingDate").Value! ?? "";
            sessionInfo = user.FindFirst("sessionInfo").Value! ?? "";
            sessionId = Int32.Parse(user.FindFirst("sessionId")!.Value);
            isFirstSession = Convert.ToBoolean(user.FindFirst("isFirstSession")!.Value);

        }

        private void setClaims(string userName, string branchName, string branchCode, int branchId, string societyName, string contact, string address, string email, string userId, string workingDate, string sessionInfo, int sessionId, bool isFirstSession)
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
        }
    }
    public class ScriptPath
    {
        public string LoanAdvancement { get; set; } = ""!;
    }
}