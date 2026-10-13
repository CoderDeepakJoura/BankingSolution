using BankingPlatform.API.DTO.Agent;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Agent;

namespace BankingPlatform.API.Service.Agent
{
    public class AccountAgentService
    {
        private readonly BankingDbContext _db;
        public AccountAgentService(BankingDbContext db) => _db = db;

        private static string AccTypeName(int t) => t switch
        {
            2 => "Saving", 3 => "General", 4 => "Share Money", 5 => "RD", 6 => "FD", _ => t.ToString()
        };

        private record AccInfo(string AccountNumber, string AccountName);

        public async Task<List<AccountAgentDTO>> GetAccountsByAgentAsync(int branchId, int agentId)
        {
            var rows = await _db.accountagent.AsNoTracking()
                .Where(x => x.branchid == branchId && x.agentid == agentId && x.todate == null)
                .ToListAsync();

            var accIds = rows.Select(x => x.accountid).Distinct().ToList();
            Dictionary<int, AccInfo> accounts;
            if (accIds.Any())
            {
                var rawAccs = await _db.accountmaster.AsNoTracking()
                    .Where(x => x.BranchId == branchId && accIds.Contains(x.ID))
                    .Select(x => new { x.ID, x.AccountNumber, x.AccountName })
                    .ToListAsync();
                accounts = rawAccs.ToDictionary(x => x.ID, x => new AccInfo(x.AccountNumber, x.AccountName ?? ""));
            }
            else accounts = new Dictionary<int, AccInfo>();

            var agents = await _db.agentmaster.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .Select(x => new { x.id, x.name })
                .ToDictionaryAsync(x => x.id, x => x.name);

            return rows.Select(x =>
            {
                accounts.TryGetValue(x.accountid, out var acc);
                agents.TryGetValue(x.agentid, out var agentName);
                return new AccountAgentDTO
                {
                    Id = x.id, BranchId = x.branchid, AccountId = x.accountid,
                    AccountNo = acc?.AccountNumber ?? x.accountid.ToString(),
                    AccountName = acc?.AccountName ?? "",
                    AccType = x.acctype, AccTypeName = AccTypeName(x.acctype),
                    AgentId = x.agentid, AgentName = agentName ?? "",
                    FromDate = x.fromdate.ToString("yyyy-MM-dd"),
                    ToDate = x.todate?.ToString("yyyy-MM-dd")
                };
            }).OrderBy(x => x.AccountName).ToList();
        }

        public async Task<List<AccountAgentDTO>> GetHistoryByAccountAsync(int branchId, int accountId)
        {
            var rows = await _db.accountagent.AsNoTracking()
                .Where(x => x.branchid == branchId && x.accountid == accountId)
                .OrderByDescending(x => x.fromdate)
                .ToListAsync();

            var agentIds = rows.Select(x => x.agentid).Distinct().ToList();
            var agents = agentIds.Any()
                ? await _db.agentmaster.AsNoTracking().Where(x => agentIds.Contains(x.id))
                    .Select(x => new { x.id, x.name }).ToDictionaryAsync(x => x.id, x => x.name)
                : new Dictionary<int, string>();

            var rawAcc = await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.ID == accountId)
                .Select(x => new { x.AccountNumber, x.AccountName })
                .FirstOrDefaultAsync();

            return rows.Select(x =>
            {
                agents.TryGetValue(x.agentid, out var agentName);
                return new AccountAgentDTO
                {
                    Id = x.id, BranchId = x.branchid, AccountId = x.accountid,
                    AccountNo = rawAcc?.AccountNumber ?? x.accountid.ToString(),
                    AccountName = rawAcc?.AccountName ?? "",
                    AccType = x.acctype, AccTypeName = AccTypeName(x.acctype),
                    AgentId = x.agentid, AgentName = agentName ?? "",
                    FromDate = x.fromdate.ToString("yyyy-MM-dd"),
                    ToDate = x.todate?.ToString("yyyy-MM-dd")
                };
            }).ToList();
        }

        public async Task<string> TransferAccountsAsync(TransferAgentDTO dto)
        {
            if (dto.FromAgentId == dto.ToAgentId) return "Source and destination agent must be different.";
            if (!dto.AccountIds.Any()) return "No accounts selected.";

            if (!DateTime.TryParse(dto.EffectiveDate, out var effDate))
                return "Invalid effective date.";

            var toAgent = await _db.agentmaster.FirstOrDefaultAsync(x => x.id == dto.ToAgentId && x.branchid == dto.BranchId);
            if (toAgent == null) return "Destination agent not found.";

            var toClose = effDate.AddDays(-1);

            foreach (var accId in dto.AccountIds)
            {
                var existing = await _db.accountagent.FirstOrDefaultAsync(x =>
                    x.branchid == dto.BranchId && x.accountid == accId &&
                    x.agentid == dto.FromAgentId && x.todate == null);

                if (existing == null) continue;

                existing.todate = toClose;

                await _db.accountagent.AddAsync(new AccountAgent
                {
                    branchid = dto.BranchId,
                    accountid = accId,
                    acctype = existing.acctype,
                    agentid = dto.ToAgentId,
                    fromdate = effDate,
                    todate = null
                });
            }

            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> AssignAgentAsync(int branchId, int accountId, int accType, int agentId, DateTime fromDate)
        {
            var agent = await _db.agentmaster.FirstOrDefaultAsync(x => x.id == agentId && x.branchid == branchId);
            if (agent == null) return "Agent not found.";

            var existing = await _db.accountagent.FirstOrDefaultAsync(x =>
                x.branchid == branchId && x.accountid == accountId && x.todate == null);
            if (existing != null)
            {
                existing.todate = fromDate.AddDays(-1);
            }

            await _db.accountagent.AddAsync(new AccountAgent
            {
                branchid = branchId, accountid = accountId, acctype = accType,
                agentid = agentId, fromdate = fromDate, todate = null
            });
            await _db.SaveChangesAsync();
            return "Success";
        }
    }
}
