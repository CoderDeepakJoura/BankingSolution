using BankingPlatform.API.DTO.Agent;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Agent;

namespace BankingPlatform.API.Service.Agent
{
    public class AgentLoginManagementService
    {
        private readonly BankingDbContext _db;

        public AgentLoginManagementService(BankingDbContext db) => _db = db;

        public async Task<List<AgentLoginListDTO>> GetAllAsync(int branchId)
        {
            var logins = await _db.agentlogin.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .ToListAsync();

            var agentIds = logins.Select(x => x.agentmasterid).Distinct().ToList();
            var agents = await _db.agentmaster.AsNoTracking()
                .Where(x => agentIds.Contains(x.id))
                .ToDictionaryAsync(x => x.id, x => new { x.name, x.code });

            return logins.Select(x =>
            {
                agents.TryGetValue(x.agentmasterid, out var agent);
                return new AgentLoginListDTO
                {
                    Id = x.id,
                    BranchId = x.branchid,
                    AgentMasterId = x.agentmasterid,
                    AgentName = agent?.name ?? "",
                    AgentCode = agent?.code ?? "",
                    Username = x.username,
                    IsSuperAgent = x.issuperagent,
                    IsActive = x.isactive,
                    CreatedAt = x.createdat
                };
            }).OrderBy(x => x.AgentName).ToList();
        }

        public async Task<string> CreateAsync(CreateAgentLoginDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || dto.Username.Length < 4)
                return "Username must be at least 4 characters.";

            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                return "Password must be at least 6 characters.";

            var agent = await _db.agentmaster.FirstOrDefaultAsync(
                x => x.id == dto.AgentMasterId && x.branchid == dto.BranchId);
            if (agent == null)
                return "Agent not found.";

            var exists = await _db.agentlogin.AnyAsync(
                x => x.username.ToLower() == dto.Username.ToLower().Trim());
            if (exists)
                return "Username already taken.";

            var existing = await _db.agentlogin.FirstOrDefaultAsync(
                x => x.branchid == dto.BranchId && x.agentmasterid == dto.AgentMasterId);
            if (existing != null)
                return "A login already exists for this agent.";

            await _db.agentlogin.AddAsync(new AgentLogin
            {
                branchid = dto.BranchId,
                agentmasterid = dto.AgentMasterId,
                username = dto.Username.Trim(),
                passwordhash = AgentAuthService.HashPassword(dto.Password),
                issuperagent = dto.IsSuperAgent,
                isactive = true,
                createdat = DateTime.Now
            });
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> ResetPasswordAsync(ResetAgentPasswordDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return "Password must be at least 6 characters.";

            var login = await _db.agentlogin.FirstOrDefaultAsync(
                x => x.id == dto.AgentLoginId && x.branchid == dto.BranchId);
            if (login == null)
                return "Agent login not found.";

            login.passwordhash = AgentAuthService.HashPassword(dto.NewPassword);
            // Invalidate existing refresh tokens on password reset
            login.refreshtoken = null;
            login.refreshtokenexpiry = null;
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> ToggleActiveAsync(ToggleAgentLoginDTO dto)
        {
            var login = await _db.agentlogin.FirstOrDefaultAsync(
                x => x.id == dto.AgentLoginId && x.branchid == dto.BranchId);
            if (login == null)
                return "Agent login not found.";

            login.isactive = dto.IsActive;
            if (!dto.IsActive)
            {
                login.refreshtoken = null;
                login.refreshtokenexpiry = null;
            }
            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAsync(int agentLoginId, int branchId)
        {
            var login = await _db.agentlogin.FirstOrDefaultAsync(
                x => x.id == agentLoginId && x.branchid == branchId);
            if (login == null)
                return "Agent login not found.";

            _db.agentlogin.Remove(login);
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
