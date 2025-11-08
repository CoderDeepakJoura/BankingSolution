using BankingPlatform.API.Controllers.Member;
using BankingPlatform.API.Service;
using BankingPlatform.API.Service.AccountMasters;
using BankingPlatform.API.Service.Caste;
using BankingPlatform.API.Service.InterestSlabs.Saving;
using BankingPlatform.API.Service.ProductMasters.FD;
using BankingPlatform.API.Service.ProductMasters.Savings;
using BankingPlatform.API.Services;
using BankingPlatform.Common.Common.CommonClasses;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddLogging();
builder.Services.AddScoped<GeneralAccountMasterService>();
builder.Services.AddScoped<CasteService>();
builder.Services.AddScoped<ImageService>();
builder.Services.AddScoped<FDProductService>();
builder.Services.AddScoped<SavingsProductService>();
builder.Services.AddScoped<SavingInterestSlabService>();
builder.Services.AddScoped<SavingAccountService>();
// Configure DbContext with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("BankingDatabase")
    ?? throw new InvalidOperationException("Connection string 'BankingDatabase' is missing.");
builder.Services.AddDbContext<BankingDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure strongly-typed JwtSettings and validate
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings configuration is missing.");
if (string.IsNullOrEmpty(jwtSettings.SecretKey) || string.IsNullOrEmpty(jwtSettings.Issuer) || string.IsNullOrEmpty(jwtSettings.Audience))
{
    throw new InvalidOperationException("JWT settings (SecretKey, Issuer, or Audience) are missing or invalid.");
}
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.Configure<DocPaths>(builder.Configuration.GetSection("DocPaths"));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<CommonClass>();
builder.Services.AddScoped<CommonFunctions>();
builder.Services.AddScoped<MemberService>();

// Configure CORS with dynamic origins
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "https://localhost:5173", "http://127.0.0.1:5173", "https://app.sicswave.com" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("_myAllowSpecificOrigins", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure rate limiting for authentication endpoints
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("Auth", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
});



// Configure JWT Authentication with cookie token support
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;

    byte[] keyBytes;
    try
    {
        keyBytes = Convert.FromBase64String(jwtSettings.SecretKey);
        var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();
        logger.LogDebug("JWT validation key decoded successfully. Length: {KeyLength} bytes", keyBytes.Length);
    }
    catch (FormatException ex)
    {
        throw new InvalidOperationException("Invalid base64 secret key in JwtSettings.", ex);
    }
    var key = new SymmetricSecurityKey(keyBytes);

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = key,
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            if (context.HttpContext.Response.HasStarted)
            {
                logger.LogWarning("Response has already started in OnMessageReceived");
                return Task.CompletedTask;
            }

            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                context.Token = authHeader.Substring("Bearer ".Length).Trim();
                try
                {
                    var parts = context.Token.Split('.');
                    if (parts.Length == 3)
                    {
                        var headerJson = Encoding.UTF8.GetString(Convert.FromBase64String(parts[0].Replace('-', '+').Replace('_', '/').PadRight((parts[0].Length + 3) & ~3, '=')));
                        var payloadJson = Encoding.UTF8.GetString(Convert.FromBase64String(parts[1].Replace('-', '+').Replace('_', '/').PadRight((parts[1].Length + 3) & ~3, '=')));
                        logger.LogInformation("Token extracted from Authorization header. Length: {Length}, Parts: {PartsCount}, Header: {Header}, Payload: {Payload}",
                            context.Token.Length, parts.Length, headerJson, payloadJson);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to decode token header/payload from Authorization header.");
                }
                return Task.CompletedTask;
            }

            var cookieToken = context.Request.Cookies["AuthToken"];
            var tempLoginToken = context.Request.Cookies["LoginToken"];

            if (!string.IsNullOrEmpty(cookieToken))
            {
                if (IsValidJwtFormat(cookieToken))
                {
                    context.Token = cookieToken;
                    try
                    {
                        var parts = cookieToken.Split('.');
                        var headerJson = Encoding.UTF8.GetString(Convert.FromBase64String(parts[0]
                            .Replace('-', '+').Replace('_', '/').PadRight((parts[0].Length + 3) & ~3, '=')));
                        var payloadJson = Encoding.UTF8.GetString(Convert.FromBase64String(parts[1]
                            .Replace('-', '+').Replace('_', '/').PadRight((parts[1].Length + 3) & ~3, '=')));
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to decode token header/payload from AuthToken cookie.");
                    }
                }
                else
                {
                    logger.LogWarning("Invalid JWT format in AuthToken cookie. Length: {Length}, Parts: {PartsCount}",
                        cookieToken.Length, cookieToken.Split('.').Length);

                    if (context.Request.Path.Value?.EndsWith("/api/auth/logout", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        context.NoResult();
                        logger.LogInformation("Bypassing token validation for logout endpoint.");
                    }
                }
            }
            else if (!string.IsNullOrEmpty(tempLoginToken))
            {
                // 🔑 Handle LoginToken
                if (context.Request.Path.Value?.Contains("/api/auth/working-date", StringComparison.OrdinalIgnoreCase) == true)
                {
                    context.Token = tempLoginToken;
                    logger.LogInformation("Using temporary LoginToken for login confirmation.");
                }
                else
                {
                    context.NoResult();
                    logger.LogWarning("LoginToken found but not allowed for this endpoint: {Path}", context.Request.Path);
                }
            }
            else
            {
                logger.LogWarning("No AuthToken or LoginToken found in request.");
                if (
                    context.Request.Path.Value?.EndsWith("/api/auth/login", StringComparison.OrdinalIgnoreCase) == true
                    || context.Request.Path.Value?.EndsWith("/api/auth/working-date", StringComparison.OrdinalIgnoreCase) == true
                    || context.Request.Path.Value?.EndsWith("/api/auth/logout", StringComparison.OrdinalIgnoreCase) == true)
                {
                    context.NoResult();
                    logger.LogInformation("Bypassing token validation for public auth endpoint: {Path}", context.Request.Path);
                }
            }


            return Task.CompletedTask;
        },
        OnAuthenticationFailed = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError("JWT Authentication failed: {Message}", context.Exception.Message);

            var token = context.Request.Cookies["AuthToken"];
            if (!string.IsNullOrEmpty(token))
            {
                logger.LogError("Invalid token format. Length: {Length}, Parts: {PartsCount}",
                    token.Length, token.Split('.').Length);
            }

            if (context.Request.Path.Value?.EndsWith("/api/auth/logout", StringComparison.OrdinalIgnoreCase) == true)
            {
                context.NoResult();
                logger.LogInformation("Bypassing authentication failure response for logout endpoint.");
            }

            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogInformation("JWT Token validated successfully for user: {User}",
                                  context.Principal?.Identity?.Name ?? "Anonymous");
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Configure Swagger with JWT and Cookie support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Banking Platform API",
        Version = "v1",
        Description = "Banking Platform API with JWT Authentication"
    });

    c.AddSecurityDefinition("cookieAuth", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Cookie,
        Name = "AuthToken",
        Description = "Cookie authentication using AuthToken"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "cookieAuth" }
            },
            Array.Empty<string>()
        },
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.Use(async (context, next) =>
{
    var origin = context.Request.Headers["Origin"].ToString();
    var method = context.Request.Method;
    var path = context.Request.Path;

    Console.WriteLine($"🌐 Request: {method} {path} from Origin: {origin}");

    // ✅ Handle preflight OPTIONS requests manually if needed
    if (method == "OPTIONS")
    {
        Console.WriteLine("🔄 Preflight OPTIONS request detected");

        var allowedOrigins = new[] {
            "https://app.sicswave.com",
            "https://localhost:5173",
            "http://127.0.0.1:5173"
        };

        if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            context.Response.Headers.Add("Access-Control-Allow-Origin", origin);
            context.Response.Headers.Add("Access-Control-Allow-Credentials", "true");
            context.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            context.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
            context.Response.StatusCode = 200;
            Console.WriteLine($"✅ Preflight handled manually for: {origin}");
            return;
        }
    }

    await next();
});

// ✅ Apply CORS early in the pipeline
app.UseCors("_myAllowSpecificOrigins");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Banking Platform API V1");
        c.RoutePrefix = string.Empty;
        c.ConfigObject.AdditionalItems["withCredentials"] = true;
    });
}
else
{
    app.UseHsts();
    app.Map("/swagger", () => Results.NotFound());
}

//app.UseHttpsRedirection();
app.UseRouting();
//app.UseCors("_myAllowSpecificOrigins");
//app.UseRateLimiter();
app.UseAuthentication();

app.UseAuthorization();
app.MapControllers();

// Helper method to validate JWT format
static bool IsValidJwtFormat(string token)
{
    if (string.IsNullOrEmpty(token))
        return false;

    var parts = token.Split('.');
    if (parts.Length != 3)
        return false;

    // Basic base64url validation
    try
    {
        foreach (var part in parts)
        {
            if (string.IsNullOrEmpty(part)) return false;
            var decoded = Convert.FromBase64String(part.Replace('-', '+').Replace('_', '/').PadRight((part.Length + 3) & ~3, '='));
        }
        return true;
    }
    catch
    {
        return false;
    }
}

app.Run();