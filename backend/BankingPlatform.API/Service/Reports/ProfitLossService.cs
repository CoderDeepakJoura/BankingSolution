using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class ProfitLossLineDTO
    {
        public long HeadCode { get; set; }
        public string HeadName { get; set; } = "";
        public string TypeName { get; set; } = "";
        public int CategoryId { get; set; }
        public decimal DrTotal { get; set; }
        public decimal CrTotal { get; set; }
        public decimal Balance { get; set; }
    }

    public class ProfitLossSectionDTO
    {
        public string TypeName { get; set; } = "";
        public List<ProfitLossLineDTO> Lines { get; set; } = new();
        public decimal SubTotal { get; set; }
    }

    public class ProfitLossDTO
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public List<ProfitLossSectionDTO> IncomeSections { get; set; } = new();
        public List<ProfitLossSectionDTO> ExpenseSections { get; set; } = new();
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public decimal NetProfit { get; set; }  // positive = profit, negative = loss
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class ProfitLossService
    {
        private readonly BankingDbContext _db;

        public ProfitLossService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, ProfitLossDTO? data)> GetProfitLossAsync(
            int branchId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            // Income (cat 3) and Expense (cat 4) heads — showinreport=1 only (mirrors BalanceSheet SP)
            var heads = await (
                from ah in _db.accounthead.AsNoTracking()
                join aht in _db.accountheadtype.AsNoTracking()
                    on new { ah.accountheadtypeid, ah.branchid }
                    equals new { accountheadtypeid = aht.id, branchid = aht.branchid }
                where ah.branchid == branchId
                   && ah.showinreport == 1
                   && (aht.categoryid == 3 || aht.categoryid == 4)
                select new
                {
                    ah.headcode,
                    ah.name,
                    aht.categoryid,
                    typeName = aht.description,
                }
            ).ToListAsync();

            if (!heads.Any())
                return (false, "No income/expense account heads found for this branch.", null);

            var headCodes = heads.Select(h => h.headcode).Distinct().ToList();

            // Build prefix map matching SP's GetBalanceHEAD trailing-zeros rule
            static string GetPrefix(long headcode)
            {
                var s = headcode.ToString().PadLeft(12, '0');
                if (s[3..] == "000000000") return s[..3];
                if (s[6..] == "000000")    return s[..6];
                if (s[9..] == "000")       return s[..9];
                return s;
            }

            var prefixEntries = headCodes.Select(hc => (Hc: hc, Prefix: GetPrefix(hc))).ToList();

            // All head codes in this branch so we can map child heads to their parent P&L head
            var allBranchHeadCodes = await _db.accounthead.AsNoTracking()
                .Where(h => h.branchid == branchId)
                .Select(h => h.headcode)
                .ToListAsync();

            var childToParent = new Dictionary<long, long>();
            foreach (var childHc in allBranchHeadCodes)
            {
                var childStr = childHc.ToString().PadLeft(12, '0');
                var best = prefixEntries
                    .Where(e => childStr.StartsWith(e.Prefix))
                    .OrderByDescending(e => e.Prefix.Length)
                    .Select(e => (long?)e.Hc)
                    .FirstOrDefault();
                if (best.HasValue)
                    childToParent[childHc] = best.Value;
            }

            var expandedHcs = childToParent.Keys.ToList();

            // Voucher balances within the period — VoucherStatus V/A only, with prefix-expanded head codes
            var nextDay = toDate.Date.AddDays(1);
            var voucherRaw = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == branchId
                         && (v.VoucherStatus == "V" || v.VoucherStatus == "A")
                         && v.ValueDate >= fromDate.Date
                         && v.ValueDate < nextDay
                         && expandedHcs.Contains(v.AccHeadCode))
                .GroupBy(v => v.AccHeadCode)
                .Select(g => new
                {
                    HeadCode = g.Key,
                    TotalDr  = g.Where(v => v.VoucherEntryType == "Dr").Sum(v => v.VoucherAmount),
                    TotalCr  = g.Where(v => v.VoucherEntryType == "Cr").Sum(v => v.VoucherAmount),
                })
                .ToListAsync();

            // Roll up child-head vouchers to parent reporting P&L head
            var voucherByParent = new Dictionary<long, (decimal Dr, decimal Cr)>();
            foreach (var v in voucherRaw)
            {
                if (!childToParent.TryGetValue(v.HeadCode, out var parentHc)) continue;
                var (dr, cr) = voucherByParent.GetValueOrDefault(parentHc);
                voucherByParent[parentHc] = (dr + v.TotalDr, cr + v.TotalCr);
            }

            var allLines = heads.Select(h =>
            {
                voucherByParent.TryGetValue(h.headcode, out var vb);
                decimal dr = vb.Dr;
                decimal cr = vb.Cr;
                // Income (cat 3): Cr normal balance → Cr-Dr; Expense (cat 4): Dr normal → Dr-Cr
                decimal balance = (h.categoryid == 3) ? cr - dr : dr - cr;

                return new ProfitLossLineDTO
                {
                    HeadCode   = h.headcode,
                    HeadName   = h.name,
                    CategoryId = h.categoryid,
                    TypeName   = h.typeName,
                    DrTotal    = dr,
                    CrTotal    = cr,
                    Balance    = balance,
                };
            })
            .Where(l => l.Balance != 0)
            .ToList();

            var income   = allLines.Where(l => l.CategoryId == 3).ToList();
            var expenses = allLines.Where(l => l.CategoryId == 4).ToList();

            decimal totalIncome  = income.Sum(l => l.Balance);
            decimal totalExpense = expenses.Sum(l => l.Balance);
            decimal netProfit    = totalIncome - totalExpense;

            static List<ProfitLossSectionDTO> ToSections(List<ProfitLossLineDTO> lines) =>
                lines.GroupBy(l => l.TypeName)
                     .Select(g => new ProfitLossSectionDTO
                     {
                         TypeName = g.Key,
                         Lines    = g.OrderBy(l => l.HeadCode).ToList(),
                         SubTotal = g.Sum(l => l.Balance),
                     })
                     .OrderBy(s => s.TypeName)
                     .ToList();

            return (true, "Success", new ProfitLossDTO
            {
                FromDate        = fromDate,
                ToDate          = toDate,
                BranchName      = branch?.branchmaster_name ?? "",
                BranchAddress   = branch?.branchmaster_addressline ?? "",
                IncomeSections  = ToSections(income),
                ExpenseSections = ToSections(expenses),
                TotalIncome     = totalIncome,
                TotalExpense    = totalExpense,
                NetProfit       = netProfit,
            });
        }
    }
}
