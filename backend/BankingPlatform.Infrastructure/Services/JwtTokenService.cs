using BankingPlatform.Infrastructure.Common;
using BankingPlatform.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
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

    public string GenerateToken(DateTime? expiresAt = null)
    {
        byte[] keyBytes;
        try
        {
            keyBytes = Convert.FromBase64String(_jwtSettings.SecretKey);
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid base64 secret key in JwtSettings.");
            throw new InvalidOperationException("Invalid base64 secret key in JwtSettings.", ex);
        }

        var key = new SymmetricSecurityKey(keyBytes);
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

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
            new Claim("workingDate", _commonClass.workingDate),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("sessionInfo", _commonClass.sessionInfo),
            new Claim("sessionId", _commonClass.sessionId.ToString()),
            new Claim("isFirstSession", _commonClass.isFirstSession.ToString()),
            new Claim("isSu", _commonClass.isSu.ToString()),
            new Claim("sessionFromDate", _commonClass.sessionFromDate),
            new Claim("sessionToDate", _commonClass.sessionToDate)
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expiresAt ?? DateTime.UtcNow.AddDays(_jwtSettings.ExpiryDays),
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        _logger.LogInformation("JWT issued for user: {Username}, expires: {Expiry}", _commonClass.userName, token.ValidTo);
        return tokenString;
    }

    public static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}