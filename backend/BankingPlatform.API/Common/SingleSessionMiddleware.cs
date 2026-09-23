using BankingPlatform.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BankingPlatform.API.Common;

/// <summary>
/// When "Enforce Single Session Login" is enabled for a branch, validates that the
/// session_stamp in the JWT matches the one stored in the user row.
/// A new login rotates the stamp, making all previously-issued JWTs invalid immediately.
///
/// Settings are cached per branch for 60 s to avoid a DB hit on every request.
/// Only the user-stamp lookup hits the DB on each authenticated request.
/// </summary>
public class SingleSessionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public SingleSessionMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context, BankingDbContext db)
    {
        // Auth endpoints (login, refresh, logout, heartbeat, working-date) must never be
        // blocked by stamp check — the login request itself arrives with the stale cookie.
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/api/auth/", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var userIdClaim   = context.User.FindFirst("userId")?.Value;
        var branchIdClaim = context.User.FindFirst("branchId")?.Value;
        var stampClaim    = context.User.FindFirst("session_stamp")?.Value;

        if (!int.TryParse(userIdClaim, out int userId) ||
            !int.TryParse(branchIdClaim, out int branchId))
        {
            await _next(context);
            return;
        }

        // Settings cached per branch — re-read at most once per 60 s
        bool enforced = await _cache.GetOrCreateAsync($"singleSession:{branchId}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60);
            var settings = await db.superusersettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.branchid == branchId);
            return settings?.enforceSingleSession == true;
        });

        if (!enforced)
        {
            await _next(context);
            return;
        }

        // One DB query per request — fetch user stamp
        var dbUser = await db.user.AsNoTracking()
            .FirstOrDefaultAsync(u => u.id == userId && u.branchid == branchId);

        var dbStamp = dbUser?.sessionstamp ?? "";

        if (!string.IsNullOrEmpty(dbStamp) &&
            !string.Equals(stampClaim, dbStamp, StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                "{\"success\":false,\"message\":\"Session expired. Your account was logged in from another location.\"}");
            return;
        }

        await _next(context);
    }
}
