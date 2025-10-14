using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using System.Security.Claims;

namespace BankingPlatform.API.Service
{
    public class ErrorLogService
    {
        private readonly BankingDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<ErrorLogService> _logger;

        public ErrorLogService(
            BankingDbContext context,
            IHttpContextAccessor httpContextAccessor,
            ILogger<ErrorLogService> logger)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task LogErrors(Exception ex, string functionName, string screenName)
        {
            try
            {
                var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
                int branchId = 0;
                int userId = 0;

                if (claimsPrincipal?.Identity?.IsAuthenticated == true)
                {
                    var branchIdClaim = claimsPrincipal.FindFirst("branchId")?.Value
                                     ?? claimsPrincipal.FindFirst("BranchId")?.Value
                                     ?? claimsPrincipal.FindFirst(ClaimTypes.GroupSid)?.Value;

                    var userIdClaim = claimsPrincipal.FindFirst("userId")?.Value
                                   ?? claimsPrincipal.FindFirst("UserId")?.Value
                                   ?? claimsPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                    if (!string.IsNullOrEmpty(branchIdClaim))
                    {
                        int.TryParse(branchIdClaim, out branchId);
                    }

                    if (!string.IsNullOrEmpty(userIdClaim))
                    {
                        int.TryParse(userIdClaim, out userId);
                    }
                }

                // ✅ Get additional context information
                var httpContext = _httpContextAccessor.HttpContext;
                var requestPath = httpContext?.Request?.Path.Value ?? "Unknown";
                var requestMethod = httpContext?.Request?.Method ?? "Unknown";
                var userAgent = httpContext?.Request?.Headers["User-Agent"].FirstOrDefault() ?? "Unknown";
                var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString() ?? "Unknown";

                var errorLogInfo = new ErrorLog
                {
                    BranchId = branchId,
                    ErrorDateTime = DateTime.Now,
                    ErrorMessage = ex.Message,
                    StackTrace = ex.StackTrace ?? "",
                    InnerException = ex.InnerException?.Message,
                    FunctionName = functionName,
                    ScreenName = screenName,
                    UserId = userId,
                    // ✅ Additional fields if your ErrorLog model supports them
                    // RequestPath = requestPath,
                    // RequestMethod = requestMethod,
                    // UserAgent = userAgent,
                    // IpAddress = ipAddress
                };

                _context.errorlog.Add(errorLogInfo);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Error logged successfully to database. ErrorId: {ErrorId}, User: {UserId}, Branch: {BranchId}",
                    errorLogInfo.Id, userId, branchId);
            }
            catch (Exception logException)
            {
                _logger.LogError(logException, "Failed to log error to database. Original error: {OriginalError}", ex.Message);

                // ✅ Fallback logging to file or other system
                try
                {
                    await LogToFile(ex, functionName, screenName, logException);
                }
                catch (Exception fileLogEx)
                {
                    _logger.LogCritical(fileLogEx, "Failed to log error to both database and file. Original error: {OriginalError}", ex.Message);
                }
            }
        }

        private async Task LogToFile(Exception originalEx, string functionName, string screenName, Exception logException)
        {
            try
            {
                var logDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Logs");
                if (!Directory.Exists(logDirectory))
                {
                    Directory.CreateDirectory(logDirectory);
                }

                var logFile = Path.Combine(logDirectory, $"error-log-{DateTime.Now:yyyy-MM-dd}.txt");
                var logEntry = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ERROR in {screenName}/{functionName}\n" +
                              $"Original Error: {originalEx.Message}\n" +
                              $"Stack Trace: {originalEx.StackTrace}\n" +
                              $"Database Log Error: {logException.Message}\n" +
                              $"----------------------------------------\n\n";

                await File.AppendAllTextAsync(logFile, logEntry);
            }
            catch
            {
                // Silent fail for file logging
            }
        }
    }
}
