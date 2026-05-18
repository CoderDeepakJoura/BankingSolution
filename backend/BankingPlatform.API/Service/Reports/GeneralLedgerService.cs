using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class GeneralLedgerAccountItemDTO
    {
        public int AccountId { get; set; }
        public string AccountName { get; set; } = "";
        public string AccountNo { get; set; } = "";
    }

    public class GeneralLedgerRowDTO
    {
        public DateTime ValueDate { get; set; }
        public int VoucherNo { get; set; }
        public string? Narration { get; set; }
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal RunningBalance { get; set; }
    }

    public class GeneralLedgerDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccountNo { get; set; } = "";
        public string HeadName { get; set; } = "";
        public int AccountId { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public List<GeneralLedgerRowDTO> Rows { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class GeneralLedgerService
    {
        private readonly BankingDbContext _db;

        public GeneralLedgerService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<GeneralLedgerAccountItemDTO>? data)> GetAccountsForHeadAsync(
            int branchId, long headCode)
        {
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.HeadCode == headCode && a.BranchId == branchId)
                .OrderBy(a => a.AccSuffix)
                .Select(a => new GeneralLedgerAccountItemDTO
                {
                    AccountId   = a.ID,
                    AccountName = a.AccountName ?? "",
                    AccountNo   = !string.IsNullOrWhiteSpace(a.AccountNumber)
                                      ? a.AccountNumber
                                      : (a.AccPrefix ?? "") + "-" + (a.AccSuffix ?? 0),
                })
                .ToListAsync();

            return (true, "OK", accounts);
        }

        public async Task<(bool success, string message, GeneralLedgerDTO? data)> GetGeneralLedgerAsync(
            int branchId, int accountId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            var account = await _db.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(a => a.ID == accountId);
            if (account == null)
                return (false, "Account not found.", null);

            string headName = "";
            if (account.HeadCode > 0)
            {
                var headRec = await _db.accounthead.AsNoTracking()
                    .FirstOrDefaultAsync(h => h.headcode == account.HeadCode && h.branchid == branchId);
                headName = headRec?.name ?? "";
            }

            // Pre-system opening balance
            var ob = await _db.accopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccountId == accountId);
            decimal initial = ob == null ? 0m
                : (ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount);

            // Cumulative balance before fromDate
            var priorDr = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.AccountId == accountId && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Dr")
                .SumAsync(v => (decimal?)v.VoucherAmount) ?? 0m;

            var priorCr = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.AccountId == accountId && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Cr")
                .SumAsync(v => (decimal?)v.VoucherAmount) ?? 0m;

            decimal openingBalance = initial + priorDr - priorCr;

            // Period transactions ordered by date then voucher number
            var nextDay = toDate.Date.AddDays(1);
            var periodEntries = await (
                from d in _db.vouchercreditdebitdetails.AsNoTracking()
                join v in _db.voucher.AsNoTracking() on d.VoucherID equals v.Id
                where d.AccountId == accountId
                   && d.ValueDate >= fromDate.Date
                   && d.ValueDate < nextDay
                orderby d.ValueDate, v.VoucherNo
                select new
                {
                    d.VoucherEntryType,
                    d.VoucherAmount,
                    d.Narration,
                    d.ValueDate,
                    v.VoucherNo,
                }
            ).ToListAsync();

            decimal runningBalance = openingBalance;
            var rows = new List<GeneralLedgerRowDTO>();

            foreach (var e in periodEntries)
            {
                decimal? dr = e.VoucherEntryType == "Dr" ? e.VoucherAmount : (decimal?)null;
                decimal? cr = e.VoucherEntryType == "Cr" ? e.VoucherAmount : (decimal?)null;
                runningBalance += (dr ?? 0m) - (cr ?? 0m);

                rows.Add(new GeneralLedgerRowDTO
                {
                    ValueDate      = e.ValueDate,
                    VoucherNo      = e.VoucherNo,
                    Narration      = e.Narration,
                    Dr             = dr,
                    Cr             = cr,
                    RunningBalance = runningBalance,
                });
            }

            string accNo = !string.IsNullOrWhiteSpace(account.AccountNumber)
                ? account.AccountNumber
                : $"{account.AccPrefix}-{account.AccSuffix}";

            return (true, "Success", new GeneralLedgerDTO
            {
                BranchName      = branch?.branchmaster_name ?? "",
                BranchAddress   = branch?.branchmaster_addressline ?? "",
                AccountName     = account.AccountName ?? "",
                AccountNo       = accNo,
                HeadName        = headName,
                AccountId       = accountId,
                FromDate        = fromDate,
                ToDate          = toDate,
                OpeningBalance  = openingBalance,
                Rows            = rows,
                TotalDr         = rows.Sum(r => r.Dr ?? 0m),
                TotalCr         = rows.Sum(r => r.Cr ?? 0m),
                ClosingBalance  = runningBalance,
            });
        }
    }
}
