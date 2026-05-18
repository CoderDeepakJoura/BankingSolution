using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class AccountHeadItemDTO
    {
        public long HeadCode { get; set; }
        public string Name { get; set; } = "";
        public int CategoryId { get; set; }
        public string TypeName { get; set; } = "";
    }

    public class HeadLedgerAccountDTO
    {
        public int AccountId { get; set; }
        public string AccountName { get; set; } = "";
        public string AccountNo { get; set; } = "";
        public decimal OpeningBalance { get; set; }
        public decimal PeriodDr { get; set; }
        public decimal PeriodCr { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class HeadLedgerDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string HeadName { get; set; } = "";
        public long HeadCode { get; set; }
        public string TypeName { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<HeadLedgerAccountDTO> Accounts { get; set; } = new();
        public decimal TotalOpeningBalance { get; set; }
        public decimal TotalPeriodDr { get; set; }
        public decimal TotalPeriodCr { get; set; }
        public decimal TotalClosingBalance { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class HeadLedgerService
    {
        private readonly BankingDbContext _db;

        public HeadLedgerService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<AccountHeadItemDTO>? data)> GetAccountHeadsAsync(int branchId)
        {
            var heads = await (
                from ah in _db.accounthead.AsNoTracking()
                join aht in _db.accountheadtype.AsNoTracking()
                    on new { ah.accountheadtypeid, ah.branchid }
                    equals new { accountheadtypeid = aht.id, branchid = aht.branchid }
                where ah.branchid == branchId
                orderby ah.headcode
                select new AccountHeadItemDTO
                {
                    HeadCode  = ah.headcode,
                    Name      = ah.name,
                    CategoryId = aht.categoryid,
                    TypeName  = aht.description,
                }
            ).ToListAsync();

            return (true, "OK", heads);
        }

        public async Task<(bool success, string message, HeadLedgerDTO? data)> GetHeadLedgerAsync(
            int branchId, long headCode, DateTime fromDate, DateTime toDate)
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            var head = await (
                from ah in _db.accounthead.AsNoTracking()
                join aht in _db.accountheadtype.AsNoTracking()
                    on new { ah.accountheadtypeid, ah.branchid }
                    equals new { accountheadtypeid = aht.id, branchid = aht.branchid }
                where ah.headcode == headCode && ah.branchid == branchId
                select new { ah.name, TypeName = aht.description }
            ).FirstOrDefaultAsync();

            if (head == null)
                return (false, "Account head not found.", null);

            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.HeadCode == headCode && a.BranchId == branchId)
                .Select(a => new { a.ID, a.AccountName, a.AccountNumber, a.AccPrefix, a.AccSuffix })
                .ToListAsync();

            if (!accounts.Any())
                return (false, "No accounts found under this head.", null);

            var accountIds = accounts.Select(a => a.ID).ToList();
            var nextDay = toDate.Date.AddDays(1);

            // Prior balance components (before fromDate)
            var priorDrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Dr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            var priorCrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Cr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            // Pre-system opening balances
            var obRecords = await _db.accopeningbalance.AsNoTracking()
                .Where(ob => accountIds.Contains(ob.AccountId) && ob.BranchId == branchId)
                .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

            // Period Dr/Cr
            var periodDrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.ValueDate >= fromDate.Date && v.ValueDate < nextDay && v.VoucherEntryType == "Dr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            var periodCrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.ValueDate >= fromDate.Date && v.ValueDate < nextDay && v.VoucherEntryType == "Cr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            var result = accounts.Select(a =>
            {
                var ob = obRecords.GetValueOrDefault(a.ID);
                decimal initial = ob == null ? 0m
                    : (ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount);

                decimal priorDr = priorDrMap.GetValueOrDefault(a.ID);
                decimal priorCr = priorCrMap.GetValueOrDefault(a.ID);
                decimal openingBalance = initial + priorDr - priorCr;

                decimal periodDr = periodDrMap.GetValueOrDefault(a.ID);
                decimal periodCr = periodCrMap.GetValueOrDefault(a.ID);
                decimal closingBalance = openingBalance + periodDr - periodCr;

                string accNo = !string.IsNullOrWhiteSpace(a.AccountNumber)
                    ? a.AccountNumber
                    : $"{a.AccPrefix}-{a.AccSuffix}";

                return new HeadLedgerAccountDTO
                {
                    AccountId      = a.ID,
                    AccountName    = a.AccountName ?? "",
                    AccountNo      = accNo,
                    OpeningBalance = openingBalance,
                    PeriodDr       = periodDr,
                    PeriodCr       = periodCr,
                    ClosingBalance = closingBalance,
                };
            }).ToList();

            return (true, "Success", new HeadLedgerDTO
            {
                BranchName          = branch?.branchmaster_name ?? "",
                BranchAddress       = branch?.branchmaster_addressline ?? "",
                HeadName            = head.name,
                HeadCode            = headCode,
                TypeName            = head.TypeName,
                FromDate            = fromDate,
                ToDate              = toDate,
                Accounts            = result,
                TotalOpeningBalance = result.Sum(a => a.OpeningBalance),
                TotalPeriodDr       = result.Sum(a => a.PeriodDr),
                TotalPeriodCr       = result.Sum(a => a.PeriodCr),
                TotalClosingBalance = result.Sum(a => a.ClosingBalance),
            });
        }
    }
}
