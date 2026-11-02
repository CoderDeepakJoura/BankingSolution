using BankingPlatform.API.DTO.Agent;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Agent;

namespace BankingPlatform.API.Service.Agent
{
    public class AgentMobileService
    {
        private readonly BankingDbContext _db;

        public AgentMobileService(BankingDbContext db) => _db = db;

        // ── RD Accounts ──────────────────────────────────────────────────────────

        public async Task<List<AgentRDAccountDTO>> GetRDAccountsAsync(int agentLoginId, int branchId)
        {
            var agentMasterId = await GetAgentMasterIdAsync(agentLoginId, branchId);
            if (agentMasterId == 0) return new();

            var assignments = await _db.accountagent.AsNoTracking()
                .Where(x => x.branchid == branchId && x.agentid == agentMasterId
                         && x.acctype == 5 && x.todate == null)
                .Select(x => x.accountid)
                .ToListAsync();

            if (!assignments.Any()) return new();

            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && assignments.Contains(x.ID))
                .ToListAsync();

            var accIds = accounts.Select(x => x.ID).ToList();

            var rdDetails = await _db.rdaccountdetail.AsNoTracking()
                .Where(x => x.BrId == branchId && accIds.Contains(x.AccId ?? 0) && x.Status == 1)
                .GroupBy(x => x.AccId)
                .Select(g => new { AccId = g.Key, KistAmt = g.Max(x => x.KistAmt) })
                .ToListAsync();

            // Today's collections (already collected)
            var today = DateTime.Today;
            var todayCollections = await _db.agentcollection.AsNoTracking()
                .Where(x => x.branchid == branchId && x.agentid == agentMasterId
                         && x.acctype == "RD" && x.collectiondate == today
                         && accIds.Contains(x.accountid))
                .ToListAsync();

            var memberIds = accounts.Where(x => x.MemberId.HasValue).Select(x => x.MemberId!.Value).Distinct().ToList();
            var members = await _db.member.AsNoTracking()
                .Where(x => memberIds.Contains(x.Id))
                .Select(x => new { x.Id, x.MemberName, x.RelativeName, x.PhoneNo1 })
                .ToDictionaryAsync(x => x.Id);

            var balances = await GetSavingStyleBalancesAsync(branchId, accIds);

            return accounts.Select(acc =>
            {
                var rd = rdDetails.FirstOrDefault(r => r.AccId == acc.ID);
                var col = todayCollections.FirstOrDefault(c => c.accountid == acc.ID);
                members.TryGetValue(acc.MemberId ?? 0, out var m);
                balances.TryGetValue(acc.ID, out var bal);
                return new AgentRDAccountDTO
                {
                    AccountId = acc.ID,
                    AccountNo = BuildAccNo(acc),
                    AccountName = acc.AccountName ?? "",
                    RelativeName = m?.RelativeName ?? "",
                    ProductName = "",
                    Balance = bal,
                    KistAmount = rd?.KistAmt ?? 0,
                    MobileNumber = m?.PhoneNo1 ?? "",
                    CollectedToday = col != null,
                    CollectedAmount = col?.amount
                };
            }).ToList();
        }

        // ── Saving Accounts ───────────────────────────────────────────────────────

        public async Task<List<AgentSavingAccountDTO>> GetSavingAccountsAsync(int agentLoginId, int branchId)
        {
            var agentMasterId = await GetAgentMasterIdAsync(agentLoginId, branchId);
            if (agentMasterId == 0) return new();

            var assignments = await _db.accountagent.AsNoTracking()
                .Where(x => x.branchid == branchId && x.agentid == agentMasterId
                         && x.acctype == 2 && x.todate == null)
                .Select(x => x.accountid)
                .ToListAsync();

            if (!assignments.Any()) return new();

            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && assignments.Contains(x.ID))
                .ToListAsync();

            var accIds = accounts.Select(x => x.ID).ToList();

            var today = DateTime.Today;
            var todayCollections = await _db.agentcollection.AsNoTracking()
                .Where(x => x.branchid == branchId && x.agentid == agentMasterId
                         && x.acctype == "Saving" && x.collectiondate == today
                         && accIds.Contains(x.accountid))
                .ToListAsync();

            var memberIds = accounts.Where(x => x.MemberId.HasValue).Select(x => x.MemberId!.Value).Distinct().ToList();
            var members = await _db.member.AsNoTracking()
                .Where(x => memberIds.Contains(x.Id))
                .Select(x => new { x.Id, x.MemberName, x.RelativeName, x.PhoneNo1 })
                .ToDictionaryAsync(x => x.Id);

            var balances = await GetSavingStyleBalancesAsync(branchId, accIds);

            return accounts.Select(acc =>
            {
                var col = todayCollections.FirstOrDefault(c => c.accountid == acc.ID);
                members.TryGetValue(acc.MemberId ?? 0, out var m);
                balances.TryGetValue(acc.ID, out var bal);
                return new AgentSavingAccountDTO
                {
                    AccountId = acc.ID,
                    AccountNo = BuildAccNo(acc),
                    AccountName = acc.AccountName ?? "",
                    RelativeName = m?.RelativeName ?? "",
                    ProductName = "",
                    Balance = bal,
                    MobileNumber = m?.PhoneNo1 ?? "",
                    CollectedToday = col != null,
                    CollectedAmount = col?.amount
                };
            }).ToList();
        }

        // ── Loan Accounts ─────────────────────────────────────────────────────────

        public async Task<List<AgentLoanAccountDTO>> GetLoanAccountsAsync(int agentLoginId, int branchId)
        {
            var agentMasterId = await GetAgentMasterIdAsync(agentLoginId, branchId);
            if (agentMasterId == 0) return new();

            var assignments = await _db.accountagent.AsNoTracking()
                .Where(x => x.branchid == branchId && x.agentid == agentMasterId
                         && x.acctype == 1 && x.todate == null)
                .Select(x => x.accountid)
                .ToListAsync();

            if (!assignments.Any()) return new();

            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && assignments.Contains(x.ID))
                .ToListAsync();

            var accIds = accounts.Select(x => x.ID).ToList();

            var kistDetails = await _db.accountkistdetail.AsNoTracking()
                .Where(x => x.BrId == branchId && accIds.Contains(x.AccountId))
                .ToListAsync();

            // Outstanding balance from loanaccountbalancedetail (Dr - Cr, status V or A)
            var loanBals = await _db.loanaccountbalancedetail.AsNoTracking()
                .Where(x => x.BrId == branchId && accIds.Contains(x.AccountId)
                         && (x.Status == "V" || x.Status == "A"))
                .GroupBy(x => x.AccountId)
                .Select(g => new
                {
                    AccountId = g.Key,
                    Outstanding = g.Sum(r => r.AmountDr) - g.Sum(r => r.AmountCr),
                    // IntDr/IntCr represent Cat3+Cat4 posted interest
                    InterestOutstanding = g.Sum(r => r.IntDr) - g.Sum(r => r.IntCr)
                })
                .ToDictionaryAsync(x => x.AccountId);

            var today = DateTime.Today;
            var todayCollections = await _db.agentcollection.AsNoTracking()
                .Where(x => x.branchid == branchId && x.agentid == agentMasterId
                         && x.acctype == "Loan" && x.collectiondate == today
                         && accIds.Contains(x.accountid))
                .ToListAsync();

            var memberIds = accounts.Where(x => x.MemberId.HasValue).Select(x => x.MemberId!.Value).Distinct().ToList();
            var members = await _db.member.AsNoTracking()
                .Where(x => memberIds.Contains(x.Id))
                .Select(x => new { x.Id, x.MemberName, x.RelativeName, x.PhoneNo1 })
                .ToDictionaryAsync(x => x.Id);

            return accounts.Select(acc =>
            {
                var kist = kistDetails.FirstOrDefault(k => k.AccountId == acc.ID);
                var col = todayCollections.FirstOrDefault(c => c.accountid == acc.ID);
                loanBals.TryGetValue(acc.ID, out var lbal);
                members.TryGetValue(acc.MemberId ?? 0, out var m);

                bool isStand = kist?.KistWithInterest?.Trim().ToUpper() == "Y";
                decimal outstanding = lbal?.Outstanding ?? 0;
                decimal interestDue = isStand ? Math.Max(0, lbal?.InterestOutstanding ?? 0) : 0;
                decimal principalDue = (decimal)(kist?.KistPrinPart ?? kist?.KistAmount ?? 0);

                return new AgentLoanAccountDTO
                {
                    AccountId = acc.ID,
                    AccountNo = acc.AccountNumber ?? "",
                    AccountName = acc.AccountName ?? "",
                    RelativeName = m?.RelativeName ?? "",
                    ProductName = "",
                    LoanType = isStand ? "stand" : "addInBalance",
                    OutstandingBalance = Math.Max(0, outstanding),
                    PrincipalDue = principalDue,
                    InterestDue = interestDue,
                    MobileNumber = m?.PhoneNo1 ?? "",
                    CollectedToday = col != null,
                    CollectedAmount = col?.amount
                };
            }).ToList();
        }

        // ── Post Collection ───────────────────────────────────────────────────────

        public async Task<(string Error, AgentCollectionResponseDTO? Result)> PostCollectionAsync(
            PostAgentCollectionDTO dto, int agentLoginId)
        {
            if (dto.Amount <= 0)
                return ("Amount must be greater than zero.", null);

            if (string.IsNullOrWhiteSpace(dto.AccType) ||
                dto.AccType != "RD" && dto.AccType != "Saving" && dto.AccType != "Loan")
                return ("Invalid account type. Must be RD, Saving, or Loan.", null);

            var agentMasterId = await GetAgentMasterIdAsync(agentLoginId, dto.BranchId);
            if (agentMasterId == 0)
                return ("Agent not found.", null);

            // Verify account belongs to this agent
            var accType = dto.AccType switch { "RD" => 5, "Saving" => 2, "Loan" => 1, _ => 0 };
            var assigned = await _db.accountagent.AnyAsync(x =>
                x.branchid == dto.BranchId && x.agentid == agentMasterId
                && x.accountid == dto.AccountId && x.acctype == accType && x.todate == null);

            if (!assigned)
                return ("Account is not assigned to this agent.", null);

            var today = DateTime.Today;

            var entry = new AgentCollection
            {
                branchid = dto.BranchId,
                agentid = agentMasterId,
                accountid = dto.AccountId,
                acctype = dto.AccType,
                amount = dto.Amount,
                collectiondate = today,
                isposted = false,
                notes = dto.Notes,
                createdat = DateTime.Now
            };

            await _db.agentcollection.AddAsync(entry);
            await _db.SaveChangesAsync();

            var receiptNo = $"{dto.AccType[..2]}{entry.id:D6}";

            return ("", new AgentCollectionResponseDTO
            {
                CollectionId = entry.id,
                ReceiptNo = receiptNo,
                Amount = entry.amount,
                CollectionDate = today
            });
        }

        // ── Super Agent Summary ───────────────────────────────────────────────────

        public async Task<List<AgentCollectionSummaryDTO>> GetSummaryAsync(int branchId, DateTime date)
        {
            var collections = await _db.agentcollection.AsNoTracking()
                .Where(x => x.branchid == branchId && x.collectiondate == date.Date)
                .ToListAsync();

            if (!collections.Any()) return new();

            var agentIds = collections.Select(x => x.agentid).Distinct().ToList();
            var agents = await _db.agentmaster.AsNoTracking()
                .Where(x => agentIds.Contains(x.id))
                .ToDictionaryAsync(x => x.id, x => new { x.name, x.code });

            return agentIds.Select(agentId =>
            {
                agents.TryGetValue(agentId, out var agent);
                var agentCols = collections.Where(c => c.agentid == agentId).ToList();
                var rdCols = agentCols.Where(c => c.acctype == "RD").ToList();
                var savCols = agentCols.Where(c => c.acctype == "Saving").ToList();
                var loanCols = agentCols.Where(c => c.acctype == "Loan").ToList();
                return new AgentCollectionSummaryDTO
                {
                    AgentId = agentId,
                    AgentName = agent?.name ?? "",
                    AgentCode = agent?.code ?? "",
                    RdCount = rdCols.Count,
                    RdTotal = rdCols.Sum(c => c.amount),
                    SavingCount = savCols.Count,
                    SavingTotal = savCols.Sum(c => c.amount),
                    LoanCount = loanCols.Count,
                    LoanTotal = loanCols.Sum(c => c.amount),
                    TotalCount = agentCols.Count,
                    GrandTotal = agentCols.Sum(c => c.amount)
                };
            }).OrderBy(x => x.AgentName).ToList();
        }

        // ── helpers ──────────────────────────────────────────────────────────────

        private async Task<int> GetAgentMasterIdAsync(int agentLoginId, int branchId)
        {
            var login = await _db.agentlogin.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == agentLoginId && x.branchid == branchId && x.isactive);
            return login?.agentmasterid ?? 0;
        }

        private async Task<Dictionary<int, decimal>> GetSavingStyleBalancesAsync(int branchId, List<int> accIds)
        {
            // Opening balances (Cr positive, Dr negative)
            var opening = await _db.accopeningbalance.AsNoTracking()
                .Where(x => x.BranchId == branchId && accIds.Contains(x.AccountId))
                .ToListAsync();

            var openMap = opening.ToDictionary(
                x => x.AccountId,
                x => x.EntryType == "Cr" ? x.OpeningAmount : -x.OpeningAmount);

            // Transaction balances
            var txns = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.BrId == branchId && accIds.Contains(x.AccountId)
                         && (x.EntryStatus == "V" || x.EntryStatus == "A"))
                .GroupBy(x => x.AccountId)
                .Select(g => new
                {
                    AccountId = g.Key,
                    Cr = g.Where(r => r.VoucherEntryType == "Cr").Sum(r => r.VoucherAmount),
                    Dr = g.Where(r => r.VoucherEntryType == "Dr").Sum(r => r.VoucherAmount)
                })
                .ToDictionaryAsync(x => x.AccountId);

            return accIds.ToDictionary(id => id, id =>
            {
                openMap.TryGetValue(id, out var openBal);
                txns.TryGetValue(id, out var tx);
                return openBal + (tx?.Cr ?? 0) - (tx?.Dr ?? 0);
            });
        }

        private static string BuildAccNo(Infrastructure.Models.AccMasters.AccountMaster acc)
        {
            if (!string.IsNullOrWhiteSpace(acc.AccountNumber)) return acc.AccountNumber;
            if (!string.IsNullOrWhiteSpace(acc.AccPrefix) && acc.AccSuffix.HasValue)
                return $"{acc.AccPrefix}-{acc.AccSuffix}";
            return acc.AccSuffix?.ToString() ?? acc.ID.ToString();
        }
    }
}
