using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;

namespace BankingPlatform.API.Common.Idempotency;

/// <summary>
/// Prevents duplicate voucher creation when the client retries a timed-out POST.
///
/// Usage: include an `X-Idempotency-Key: &lt;uuid&gt;` header on any POST request.
/// A successful response is cached for 5 minutes. A retry with the same key returns
/// the cached response without re-executing the action. If no header is present the
/// filter is a no-op — fully backward-compatible.
///
/// Only applies to POST requests. PUT/DELETE are idempotent by HTTP semantics.
/// Only 2xx responses are cached; error responses are never replayed (the client
/// may fix and retry freely).
/// </summary>
public sealed class IdempotencyFilter : IAsyncActionFilter
{
    private readonly IMemoryCache _cache;

    public IdempotencyFilter(IMemoryCache cache) => _cache = cache;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.HttpContext.Request.Method != "POST")
        {
            await next();
            return;
        }

        if (!context.HttpContext.Request.Headers.TryGetValue("X-Idempotency-Key", out var rawValues)
            || string.IsNullOrWhiteSpace(rawValues.FirstOrDefault()))
        {
            await next();
            return;
        }

        var cacheKey = $"idp:{rawValues.First()!.Trim()}";

        if (_cache.TryGetValue(cacheKey, out IdempotencyCachedResult? hit) && hit is not null)
        {
            context.Result = new ObjectResult(hit.Body) { StatusCode = hit.StatusCode };
            return;
        }

        var executed = await next();

        if (executed.Exception == null
            && executed.Result is ObjectResult { StatusCode: >= 200 and < 300 } ok)
        {
            _cache.Set(cacheKey, new IdempotencyCachedResult
            {
                StatusCode = ok.StatusCode ?? 200,
                Body      = ok.Value,
            }, TimeSpan.FromMinutes(5));
        }
    }
}

internal sealed record IdempotencyCachedResult
{
    public required int    StatusCode { get; init; }
    public required object? Body     { get; init; }
}
