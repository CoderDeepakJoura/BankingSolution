using BankingPlatform.Infrastructure.Common;
using BankingPlatform.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using BankingPlatform.Common.Common.CommonClasses;

public class JwtTokenService
{
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<JwtTokenService> _logger;
    private readonly CommonClass _commonClass;

    public JwtTokenService(IOptions<JwtSettings> jwtOptions, ILogger<JwtTokenService> logger, CommonClass commonClass)
    {
        _jwtSettings = jwtOptions?.Value ?? throw new ArgumentNullException(nameof(jwtOptions));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _commonClass = commonClass ?? throw new ArgumentNullException(nameof(_commonClass));
    }

    public string GenerateToken()
    {
        // Decode base64 secret key
        byte[] keyBytes;
        try
        {
            keyBytes = Convert.FromBase64String(_jwtSettings.SecretKey);
            _logger.LogDebug("Secret key decoded successfully. Length: {KeyLength} bytes", keyBytes.Length);
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid base64 secret key in JwtSettings.");
            throw new InvalidOperationException("Invalid base64 secret key in JwtSettings.", ex);
        }

        var key = new SymmetricSecurityKey(keyBytes);
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var jwtId = Guid.NewGuid().ToString();

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, _commonClass.userId),
            new Claim(ClaimTypes.Name, _commonClass.userName),
            new Claim("branchCode", _commonClass.branchCode),
            new Claim("userId", _commonClass.userId),
            new Claim("branchId", _commonClass.branchId.ToString()),
            new Claim("branchName", _commonClass.branchName),
            new Claim("societyName", _commonClass.societyName),
            new Claim("contactNo", _commonClass.contactno),
            new Claim("address", _commonClass.address),
            new Claim("emailaddress", _commonClass.email),
            new Claim("workingdate", _commonClass.workingDate),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("JwtId", jwtId),
            new Claim("sessionInfo", _commonClass.sessionInfo),
            new Claim("sessionId", _commonClass.sessionId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(_jwtSettings.ExpiryDays),
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        try
        {
            // Log token header and payload for debugging
            var parts = tokenString.Split('.');
            if (parts.Length == 3)
            {
                var headerJson = Encoding.UTF8.GetString(Convert.FromBase64String(parts[0].Replace('-', '+').Replace('_', '/').PadRight((parts[0].Length + 3) & ~3, '=')));
                var payloadJson = Encoding.UTF8.GetString(Convert.FromBase64String(parts[1].Replace('-', '+').Replace('_', '/').PadRight((parts[1].Length + 3) & ~3, '=')));
                _logger.LogDebug("JWT generated for user: {Username}. Header: {Header}, Payload: {Payload}, Length: {TokenLength}, Parts: {PartsCount}",
                    _commonClass.userName, headerJson, payloadJson, tokenString.Length, parts.Length);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to decode JWT header/payload for logging.");
        }

        return tokenString;
    }
}