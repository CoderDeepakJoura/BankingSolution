using BankingPlatform.API.DTO.Agent;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Agent;
using BankingPlatform.Infrastructure.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace BankingPlatform.API.Service.Agent
{
    public class AgentAuthService
    {
        private readonly BankingDbContext _db;
        private readonly AgentJwtSettings _jwtSettings;

        public AgentAuthService(BankingDbContext db, IOptions<AgentJwtSettings> jwtSettings)
        {
            _db = db;
            _jwtSettings = jwtSettings.Value;
        }

        public async Task<(string Error, AgentTokenResponseDTO? Token)> LoginAsync(AgentLoginRequestDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                return ("Username and password are required.", null);

            var login = await _db.agentlogin.AsNoTracking()
                .FirstOrDefaultAsync(x => x.username.ToLower() == dto.Username.ToLower().Trim());

            if (login == null || !login.isactive)
                return ("Invalid credentials.", null);

            if (!PasswordHasher.VerifyPassword(dto.Password, login.passwordhash))
                return ("Invalid credentials.", null);

            var agent = await _db.agentmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == login.agentmasterid);
            if (agent == null)
                return ("Agent account not found.", null);

            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == login.branchid);

            var (accessToken, expiresAt) = GenerateAccessToken(login, agent.name);
            var refreshToken = GenerateRefreshToken();

            // Persist refresh token (update tracked entity)
            var tracked = await _db.agentlogin.FirstOrDefaultAsync(x => x.id == login.id);
            if (tracked != null)
            {
                tracked.refreshtoken = refreshToken;
                tracked.refreshtokenexpiry = DateTime.Now.AddDays(_jwtSettings.RefreshTokenExpiryDays);
                await _db.SaveChangesAsync();
            }

            return ("", new AgentTokenResponseDTO
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
                AgentId = login.id,
                AgentMasterId = login.agentmasterid,
                BranchId = login.branchid,
                AgentName = agent.name,
                BranchName = branch?.branchmaster_name ?? "",
                IsSuperAgent = login.issuperagent
            });
        }

        public async Task<(string Error, AgentTokenResponseDTO? Token)> RefreshAsync(AgentRefreshRequestDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
                return ("Refresh token is required.", null);

            var login = await _db.agentlogin
                .FirstOrDefaultAsync(x => x.refreshtoken == dto.RefreshToken);

            if (login == null || !login.isactive)
                return ("Invalid refresh token.", null);

            if (login.refreshtokenexpiry == null || login.refreshtokenexpiry < DateTime.Now)
                return ("Refresh token has expired. Please log in again.", null);

            var agent = await _db.agentmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == login.agentmasterid);
            if (agent == null)
                return ("Agent account not found.", null);

            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == login.branchid);

            var (accessToken, expiresAt) = GenerateAccessToken(login, agent.name);
            var newRefreshToken = GenerateRefreshToken();

            login.refreshtoken = newRefreshToken;
            login.refreshtokenexpiry = DateTime.Now.AddDays(_jwtSettings.RefreshTokenExpiryDays);
            await _db.SaveChangesAsync();

            return ("", new AgentTokenResponseDTO
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = expiresAt,
                AgentId = login.id,
                AgentMasterId = login.agentmasterid,
                BranchId = login.branchid,
                AgentName = agent.name,
                BranchName = branch?.branchmaster_name ?? "",
                IsSuperAgent = login.issuperagent
            });
        }

        public async Task RevokeAsync(int agentLoginId)
        {
            var login = await _db.agentlogin.FirstOrDefaultAsync(x => x.id == agentLoginId);
            if (login != null)
            {
                login.refreshtoken = null;
                login.refreshtokenexpiry = null;
                await _db.SaveChangesAsync();
            }
        }

        // ── helpers ──────────────────────────────────────────────────────────────

        private (string Token, DateTime ExpiresAt) GenerateAccessToken(AgentLogin login, string agentName)
        {
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes);
            var keyBytes = Convert.FromBase64String(_jwtSettings.SecretKey);
            var key = new SymmetricSecurityKey(keyBytes);
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("agentId",       login.id.ToString()),
                new Claim("agentMasterId", login.agentmasterid.ToString()),
                new Claim("branchId",      login.branchid.ToString()),
                new Claim("agentName",     agentName),
                new Claim("isSuperAgent",  login.issuperagent.ToString().ToLower()),
                new Claim(JwtRegisteredClaimNames.Sub, login.username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: expiresAt,
                signingCredentials: creds);

            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }

        private static string GenerateRefreshToken()
        {
            var bytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes);
        }

        public static string HashPassword(string password) =>
            PasswordHasher.HashPassword(password);
    }
}
