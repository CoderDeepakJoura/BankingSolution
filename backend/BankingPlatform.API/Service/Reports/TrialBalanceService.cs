using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class TrialBalanceRowDTO
    {
        public long HeadCode { get; set; }
        public string HeadName { get; set; } = "";
        public int HeadTypeId { get; set; }
        public string HeadTypeName { get; set; } = "";
        public decimal DrBalance { get; set; }
        public decimal CrBalance { get; set; }
    }

    public class TrialBalanceDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime AsOfDate { get; set; }
        public List<TrialBalanceRowDTO> Rows { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class TrialBalanceService
    {
        private readonly BankingDbContext _context;

        public TrialBalanceService(BankingDbContext context) => _context = context;

        public async Task<(bool success, string message, TrialBalanceDTO? data)> GetTrialBalanceAsync(
            int branchId, DateTime asOfDate, int sessionId)
        {
            var branch = await _context.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            // Get all account heads with their type/category info
            var heads = await (
                from ah in _context.accounthead.AsNoTracking()
                join aht in _context.accountheadtype.AsNoTracking()
                    on new { ah.accountheadtypeid, ah.branchid }
                    equals new { accountheadtypeid = aht.id, branchid = aht.branchid }
                where ah.branchid == branchId
                select new
                {
                    ah.headcode,
                    ah.name,
                    TypeId = aht.categoryid,
                    TypeName = aht.description,
                }
            ).ToListAsync();

            if (!heads.Any())
            {
                return (true, "No account heads found.", new TrialBalanceDTO
                {
                    BranchName = branch?.branchmaster_name ?? "",
                    BranchAddress = branch?.branchmaster_addressline ?? "",
                    AsOfDate = asOfDate
                });
            }

            var headCodes = heads.Select(h => h.headcode).Distinct().ToList();

            // Voucher balances grouped by head code up to asOfDate (inclusive)
            // EntryStatus "V" and "A" are both valid (per balance formula in CLAUDE.md)
            var nextDay = asOfDate.Date.AddDays(1);
            var voucherBalances = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == branchId
                    && (v.EntryStatus == "V" || v.EntryStatus == "A")
                    && v.ValueDate < nextDay
                    && headCodes.Contains(v.AccHeadCode))
                .GroupBy(v => v.AccHeadCode)
                .Select(g => new
                {
                    HeadCode = g.Key,
                    TotalDr = g.Where(v => v.VoucherEntryType == "Dr").Sum(v => v.VoucherAmount),
                    TotalCr = g.Where(v => v.VoucherEntryType == "Cr").Sum(v => v.VoucherAmount),
                })
                .ToListAsync();

            var voucherMap = voucherBalances.ToDictionary(x => x.HeadCode);

            // Aggregate opening balances per head code from three sources:
            // 1. accopeningbalance  — Saving / General / ShareMoney / RD accounts
            // 2. fdaccountdetail    — FD opening balance (per-detail, no longer in accopeningbalance)
            // 3. loanaccopeningbalance — Loan opening balance (separate table with its own HeadCode)
            var obDrByHead = new Dictionary<long, decimal>();
            var obCrByHead = new Dictionary<long, decimal>();

            // ── 1. Standard opening balances (Saving, General, RD, ShareMoney) ──────────
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId && headCodes.Contains(a.HeadCode))
                .Select(a => new { a.ID, a.HeadCode })
                .ToListAsync();

            var accountIds = accounts.Select(a => a.ID).ToList();
            var accountHeadMap = accounts.ToDictionary(a => a.ID, a => a.HeadCode);

            var obRecords = await _context.accopeningbalance.AsNoTracking()
                .Where(ob => ob.BranchId == branchId && accountIds.Contains(ob.AccountId))
                .ToListAsync();

            foreach (var ob in obRecords)
            {
                if (!accountHeadMap.TryGetValue(ob.AccountId, out var hc)) continue;
                if (ob.EntryType?.ToUpper() == "DR")
                    obDrByHead[hc] = obDrByHead.GetValueOrDefault(hc) + ob.OpeningAmount;
                else
                    obCrByHead[hc] = obCrByHead.GetValueOrDefault(hc) + ob.OpeningAmount;
            }

            // ── 2. FD opening balance (stored per-detail, not in accopeningbalance) ──────
            var fdObRecords = await (
                from fd in _context.fdaccountdetail.AsNoTracking()
                join acc in _context.accountmaster.AsNoTracking()
                    on fd.AccountId equals acc.ID
                where acc.BranchId == branchId
                    && fd.OpeningBalance != null
                    && fd.OpeningBalance > 0
                    && headCodes.Contains(acc.HeadCode)
                select new
                {
                    HeadCode = acc.HeadCode,
                    fd.OpeningBalance,
                    fd.OpeningBalanceType
                }
            ).ToListAsync();

            foreach (var fd in fdObRecords)
            {
                var hc = fd.HeadCode;
                var amt = fd.OpeningBalance ?? 0m;
                if (fd.OpeningBalanceType?.ToUpper() == "DR")
                    obDrByHead[hc] = obDrByHead.GetValueOrDefault(hc) + amt;
                else
                    obCrByHead[hc] = obCrByHead.GetValueOrDefault(hc) + amt;
            }

            // ── 3. Loan opening balance (loanaccopeningbalance has HeadCode directly) ────
            var loanObRecords = await _context.loanaccopeningbalance.AsNoTracking()
                .Where(l => l.BranchId == branchId
                    && l.HeadCode != null
                    && l.TotalBalance != null
                    && headCodes.Contains(l.HeadCode!.Value))
                .ToListAsync();

            foreach (var loan in loanObRecords)
            {
                var hc = loan.HeadCode!.Value;
                var amt = loan.TotalBalance ?? 0m;
                if (loan.BalType?.ToUpper() == "DR")
                    obDrByHead[hc] = obDrByHead.GetValueOrDefault(hc) + amt;
                else
                    obCrByHead[hc] = obCrByHead.GetValueOrDefault(hc) + amt;
            }

            var rows = new List<TrialBalanceRowDTO>();

            foreach (var head in heads.OrderBy(h => h.headcode))
            {
                voucherMap.TryGetValue(head.headcode, out var vb);
                decimal dr = (vb?.TotalDr ?? 0m) + obDrByHead.GetValueOrDefault(head.headcode);
                decimal cr = (vb?.TotalCr ?? 0m) + obCrByHead.GetValueOrDefault(head.headcode);

                if (dr == 0m && cr == 0m) continue;

                rows.Add(new TrialBalanceRowDTO
                {
                    HeadCode = head.headcode,
                    HeadName = head.name ?? "",
                    HeadTypeId = head.TypeId,
                    HeadTypeName = head.TypeName ?? "",
                    DrBalance = dr,
                    CrBalance = cr
                });
            }

            return (true, "Success", new TrialBalanceDTO
            {
                BranchName = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                AsOfDate = asOfDate,
                Rows = rows,
                TotalDr = rows.Sum(r => r.DrBalance),
                TotalCr = rows.Sum(r => r.CrBalance)
            });
        }
    }
}
