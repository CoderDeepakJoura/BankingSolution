using BankingPlatform.API.Common.Idempotency;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Memory;

namespace BankingPlatform.Tests.Idempotency;

public class IdempotencyFilterTests
{
    private static IdempotencyFilter BuildFilter() =>
        new(new MemoryCache(new MemoryCacheOptions()));

    private static (ActionExecutingContext executing, Func<ActionExecutionDelegate> delegateFactory)
        BuildPostContext(string? idempotencyKey = null)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";
        if (idempotencyKey is not null)
            httpContext.Request.Headers["X-Idempotency-Key"] = idempotencyKey;

        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var executingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new object());

        Func<ActionExecutionDelegate> delegateFactory = () => () =>
        {
            var executedContext = new ActionExecutedContext(
                actionContext,
                new List<IFilterMetadata>(),
                new object());
            executedContext.Result = new ObjectResult(new { success = true, voucherNo = 42 }) { StatusCode = 200 };
            return Task.FromResult(executedContext);
        };

        return (executingContext, delegateFactory);
    }

    [Fact]
    public async Task NoHeader_ActionAlwaysExecutes()
    {
        var filter = BuildFilter();
        var (ctx, delegateFactory) = BuildPostContext(idempotencyKey: null);

        int callCount = 0;
        ActionExecutionDelegate del = () =>
        {
            callCount++;
            return delegateFactory()();
        };

        await filter.OnActionExecutionAsync(ctx, del);
        await filter.OnActionExecutionAsync(ctx, del);

        callCount.Should().Be(2, "without a key there is no caching");
    }

    [Fact]
    public async Task SameKey_SecondCallReturnsCache_ActionNotExecuted()
    {
        var filter = BuildFilter();
        var key = Guid.NewGuid().ToString();

        int callCount = 0;
        ActionExecutionDelegate del = () =>
        {
            callCount++;
            var (ctx2, _) = BuildPostContext(key);
            var executed = new ActionExecutedContext(
                new ActionContext(ctx2.HttpContext, new RouteData(), new ActionDescriptor()),
                new List<IFilterMetadata>(),
                new object());
            executed.Result = new ObjectResult(new { success = true, voucherNo = 99 }) { StatusCode = 200 };
            return Task.FromResult(executed);
        };

        var (ctx1, _) = BuildPostContext(key);
        await filter.OnActionExecutionAsync(ctx1, del);

        var (ctx2, _) = BuildPostContext(key);
        await filter.OnActionExecutionAsync(ctx2, del);

        callCount.Should().Be(1, "second call must hit the cache and not invoke the action");
        ctx2.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task DifferentKeys_BothActionsExecute()
    {
        var filter = BuildFilter();
        int callCount = 0;

        ActionExecutionDelegate del = () =>
        {
            callCount++;
            var (ctx, _) = BuildPostContext("x");
            var executed = new ActionExecutedContext(
                new ActionContext(ctx.HttpContext, new RouteData(), new ActionDescriptor()),
                new List<IFilterMetadata>(),
                new object());
            executed.Result = new ObjectResult(new { success = true }) { StatusCode = 200 };
            return Task.FromResult(executed);
        };

        var (ctx1, _) = BuildPostContext("key-A");
        var (ctx2, _) = BuildPostContext("key-B");

        await filter.OnActionExecutionAsync(ctx1, del);
        await filter.OnActionExecutionAsync(ctx2, del);

        callCount.Should().Be(2, "distinct keys must each execute the action");
    }

    [Fact]
    public async Task GetRequest_NeverCached()
    {
        var filter = BuildFilter();
        var key = Guid.NewGuid().ToString();
        int callCount = 0;

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "GET";
        httpContext.Request.Headers["X-Idempotency-Key"] = key;
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var executingContext = new ActionExecutingContext(
            actionContext, new List<IFilterMetadata>(), new Dictionary<string, object?>(), new object());

        ActionExecutionDelegate del = () =>
        {
            callCount++;
            var executed = new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), new object());
            executed.Result = new ObjectResult(new { data = "test" }) { StatusCode = 200 };
            return Task.FromResult(executed);
        };

        await filter.OnActionExecutionAsync(executingContext, del);
        await filter.OnActionExecutionAsync(executingContext, del);

        callCount.Should().Be(2, "GET requests bypass idempotency caching entirely");
    }
}
