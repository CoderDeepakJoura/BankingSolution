using BankingPlatform.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Common;

/// <summary>
/// When "Enforce Single Session Login" is enabled in SuperUserSettings,
/// validates that the session_stamp in the JWT matches the one stored in the user row.
/// A new login rotates the stamp, making all previously-issued JWTs invalid immediately.
/// </summary>
public class SingleSessionMiddleware
{
    private readonly RequestDelegate _next;

    public SingleSessionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, BankingDbContext db)
    {
        // Only check authenticated requests
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim  = context.User.FindFirst("userId")?.Value;
            var branchIdClaim = context.User.FindFirst("branchId")?.Value;
            var stampClaim   = context.User.FindFirst("session_stamp")?.Value;

            if (int.TryParse(userIdClaim, out int userId) &&
                int.TryParse(branchIdClaim, out int branchId))
            {
                // Check if single-session is enabled for this branch
                var settings = await db.superusersettings.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.branchid == branchId);

                if (settings?.enforceSingleSession == true)
                {
                    var dbUser = await db.user.AsNoTracking()
                        .FirstOrDefaultAsync(u => u.id == userId && u.branchid == branchId);

                    var dbStamp = dbUser?.sessionstamp ?? "";

                    // If the DB has a stamp but the JWT stamp doesn't match → another login occurred
                    if (!string.IsNullOrEmpty(dbStamp) &&
                        !string.Equals(stampClaim, dbStamp, StringComparison.Ordinal))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(
                            "{\"success\":false,\"message\":\"Session expired. Your account was logged in from another location.\"}");
                        return;
                    }
                }
            }
        }

        await _next(context);
    }
}
