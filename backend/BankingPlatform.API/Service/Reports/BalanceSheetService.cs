using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class BalanceSheetLineDTO
    {
        public long HeadCode { get; set; }
        public string HeadName { get; set; } = "";
        public string TypeName { get; set; } = "";
        public int CategoryId { get; set; }
        public decimal DrTotal { get; set; }
        public decimal CrTotal { get; set; }
        public decimal Balance { get; set; }
    }

    public class BalanceSheetSectionDTO
    {
        public string TypeName { get; set; } = "";
        public List<BalanceSheetLineDTO> Lines { get; set; } = new();
        public decimal SubTotal { get; set; }
    }

    public class BalanceSheetDTO
    {
        public DateTime AsOfDate { get; set; }
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public List<BalanceSheetSectionDTO> LiabilitySections { get; set; } = new();
        public List<BalanceSheetSectionDTO> AssetSections { get; set; } = new();
        public decimal TotalLiabilities { get; set; }
        public decimal TotalAssets { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public decimal NetProfit { get; set; }   // positive = profit (on liabilities side), negative = loss (on assets side)
        public decimal GrandTotalLiabilities { get; set; } // TotalLiabilities + NetProfit (if > 0)
        public decimal GrandTotalAssets { get; set; }      // TotalAssets + |NetProfit| (if < 0)
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class BalanceSheetService
    {
        private readonly BankingDbContext _db;

        public BalanceSheetService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, BalanceSheetDTO? data)> GetBalanceSheetAsync(
            int branchId, DateTime asOfDate)
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            // All account heads for this branch with their type info
            var heads = await (
                from ah in _db.accounthead.AsNoTracking()
                join aht in _db.accountheadtype.AsNoTracking()
                    on new { ah.accountheadtypeid, ah.branchid }
                    equals new { accountheadtypeid = aht.id, branchid = aht.branchid }
                where ah.branchid == branchId
                select new
                {
                    ah.headcode,
                    ah.name,
                    ah.parentid,
                    aht.categoryid,
                    typeName = aht.description,
                }
            ).ToListAsync();

            if (!heads.Any())
                return (false, "No account heads found for this branch.", null);

            // Voucher balances grouped by account head, up to asOfDate (inclusive)
            var nextDay = asOfDate.Date.AddDays(1);
            var voucherBalances = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == branchId && v.ValueDate < nextDay)
                .GroupBy(v => v.AccHeadCode)
                .Select(g => new
                {
                    HeadCode = g.Key,
                    TotalDr = g.Where(v => v.VoucherEntryType == "Dr").Sum(v => v.VoucherAmount),
                    TotalCr = g.Where(v => v.VoucherEntryType == "Cr").Sum(v => v.VoucherAmount),
                })
                .ToListAsync();

            var voucherMap = voucherBalances.ToDictionary(x => x.HeadCode);

            // Build lines
            var allLines = heads.Select(h =>
            {
                voucherMap.TryGetValue(h.headcode, out var b);
                decimal dr = b?.TotalDr ?? 0m;
                decimal cr = b?.TotalCr ?? 0m;
                // Assets (1) and Expenses (4) have Dr normal balance; Liabilities (2) and Income (3) have Cr normal balance
                decimal balance = (h.categoryid == 1 || h.categoryid == 4) ? dr - cr : cr - dr;

                return new BalanceSheetLineDTO
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

            // Split by category
            var assets      = allLines.Where(l => l.CategoryId == 1).ToList();
            var liabilities = allLines.Where(l => l.CategoryId == 2).ToList();
            var income      = allLines.Where(l => l.CategoryId == 3).ToList();
            var expenses    = allLines.Where(l => l.CategoryId == 4).ToList();

            decimal totalAssets      = assets.Sum(l => l.Balance);
            decimal totalLiabilities = liabilities.Sum(l => l.Balance);
            decimal totalIncome      = income.Sum(l => l.Balance);
            decimal totalExpense     = expenses.Sum(l => l.Balance);
            decimal netProfit        = totalIncome - totalExpense;

            // Group by type name within each category
            static List<BalanceSheetSectionDTO> ToSections(List<BalanceSheetLineDTO> lines) =>
                lines.GroupBy(l => l.TypeName)
                     .Select(g => new BalanceSheetSectionDTO
                     {
                         TypeName = g.Key,
                         Lines    = g.OrderBy(l => l.HeadCode).ToList(),
                         SubTotal = g.Sum(l => l.Balance),
                     })
                     .OrderBy(s => s.TypeName)
                     .ToList();

            var liabilitySections = ToSections(liabilities);
            var assetSections     = ToSections(assets);

            decimal grandLiabilities = totalLiabilities + (netProfit > 0 ? netProfit : 0);
            decimal grandAssets      = totalAssets      + (netProfit < 0 ? Math.Abs(netProfit) : 0);

            return (true, "Success", new BalanceSheetDTO
            {
                AsOfDate            = asOfDate,
                BranchName          = branch?.branchmaster_name ?? "",
                BranchAddress       = branch?.branchmaster_addressline ?? "",
                LiabilitySections   = liabilitySections,
                AssetSections       = assetSections,
                TotalLiabilities    = totalLiabilities,
                TotalAssets         = totalAssets,
                TotalIncome         = totalIncome,
                TotalExpense        = totalExpense,
                NetProfit           = netProfit,
                GrandTotalLiabilities = grandLiabilities,
                GrandTotalAssets    = grandAssets,
            });
        }
    }
}
