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

    public class HeadLedgerRowDTO
    {
        public DateTime ValueDate { get; set; }
        public int VoucherNo { get; set; }
        public string? Narration { get; set; }
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal RunningBalance { get; set; }
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
        public List<HeadLedgerRowDTO>? Rows { get; set; }
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

    // ── Head Ledger (In Detail) DTOs ──────────────────────────────────────────────
    // Flat combined list: ALL accounts' transactions in one date-ordered stream,
    // with a SINGLE running balance for the entire head.

    public class HeadInDetailRowDTO
    {
        public DateTime ValueDate { get; set; }
        // Populated in individual-row mode: "{AccName} Tr.No.{VoucherNo} {Narration}"
        // null in consolidate (date-grouped) mode
        public string? Particulars { get; set; }
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal RunningBalance { get; set; }
    }

    public class HeadInDetailDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string HeadName { get; set; } = "";
        public long HeadCode { get; set; }
        public string TypeName { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
        public decimal ClosingBalance { get; set; }
        public List<HeadInDetailRowDTO> Rows { get; set; } = new();
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class HeadLedgerService
    {
        private readonly BankingDbContext _db;

        public HeadLedgerService(BankingDbContext db) => _db = db;

        private static string GetHeadPrefix(long hc)
        {
            var s = hc.ToString().PadLeft(12, '0');
            if (s[3..] == "000000000") return s[..3];
            if (s[6..] == "000000")    return s[..6];
            if (s[9..] == "000")       return s[..9];
            return s;
        }

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
                    HeadCode   = ah.headcode,
                    Name       = ah.name,
                    CategoryId = aht.categoryid,
                    TypeName   = aht.description,
                }
            ).ToListAsync();

            return (true, "OK", heads);
        }

        // ── Head Ledger (In Detail) ───────────────────────────────────────────────
        // One flat combined list of ALL accounts' transactions under the head,
        // date-ordered, with a single running balance for the entire head.
        // consolidate=true: group rows by date (sum Dr/Cr per date, no Particulars).
        // nonZero=true: exclude accounts with no period transactions from OB and rows.

        public async Task<(bool success, string message, HeadInDetailDTO? data)> GetHeadInDetailAsync(
            int branchId, long headCode, DateTime fromDate, DateTime toDate,
            bool consolidate = false, bool nonZero = false)
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

            if (head == null) return (false, "Account head not found.", null);

            var prefix = GetHeadPrefix(headCode);
            var allBranchHeadCodes = await _db.accounthead.AsNoTracking()
                .Where(h => h.branchid == branchId)
                .Select(h => h.headcode)
                .ToListAsync();

            var matchingHeadCodes = allBranchHeadCodes
                .Where(hc => hc.ToString().PadLeft(12, '0').StartsWith(prefix))
                .ToList();

            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId && matchingHeadCodes.Contains(a.HeadCode))
                .OrderBy(a => a.AccSuffix)
                .Select(a => new { a.ID, a.AccountName, a.AccountNumber, a.AccPrefix, a.AccSuffix })
                .ToListAsync();

            if (!accounts.Any()) return (false, "No accounts found under this head.", null);

            var accountIds = accounts.Select(a => a.ID).ToList();
            var nextDay    = toDate.Date.AddDays(1);

            // ── Opening balances ──────────────────────────────────────────────────
            var obRecords = await _db.accopeningbalance.AsNoTracking()
                .Where(ob => accountIds.Contains(ob.AccountId) && ob.BranchId == branchId)
                .ToDictionaryAsync(ob => ob.AccountId);

            var fdObMap = new Dictionary<int, decimal>();
            {
                var fdObs = await (
                    from fd in _db.fdaccountdetail.AsNoTracking()
                    where accountIds.Contains(fd.AccountId)
                        && fd.OpeningBalance != null && fd.OpeningBalance > 0
                    select new { fd.AccountId, fd.OpeningBalance, fd.OpeningBalanceType }
                ).ToListAsync();
                foreach (var fd in fdObs)
                {
                    var amt = fd.OpeningBalance ?? 0m;
                    fdObMap[fd.AccountId] = fdObMap.GetValueOrDefault(fd.AccountId)
                        + (fd.OpeningBalanceType?.ToUpper() == "DR" ? amt : -amt);
                }
            }

            var loanObMap = new Dictionary<int, decimal>();
            {
                var loanObs = await (
                    from loan in _db.loanaccopeningbalance.AsNoTracking()
                    join acc in _db.accountmaster.AsNoTracking() on loan.AccId equals (int?)acc.ID
                    where acc.BranchId == branchId && accountIds.Contains(acc.ID)
                    select new
                    {
                        AccId = acc.ID,
                        loan.TotalBalance, loan.BalType,
                        loan.OverDueBal,   loan.OverBalType,
                        loan.OpenInt,      loan.OpenIntType,
                        loan.OpenOverInt,  loan.OpenOverIntType,
                    }
                ).ToListAsync();
                static decimal S(decimal? amt, string? t) => (amt ?? 0m) * (t?.ToUpper() == "DR" ? 1m : -1m);
                foreach (var loan in loanObs)
                    loanObMap[loan.AccId] = loanObMap.GetValueOrDefault(loan.AccId)
                        + S(loan.TotalBalance, loan.BalType) + S(loan.OverDueBal, loan.OverBalType)
                        + S(loan.OpenInt, loan.OpenIntType)  + S(loan.OpenOverInt, loan.OpenOverIntType);
            }

            decimal GetInitialOB(int accId)
            {
                if (loanObMap.TryGetValue(accId, out var lb)) return lb;
                if (fdObMap.TryGetValue(accId, out var fb))   return fb;
                var ob = obRecords.GetValueOrDefault(accId);
                if (ob == null) return 0m;
                return ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount;
            }

            var priorDrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId)
                    && (v.VoucherStatus == "V" || v.VoucherStatus == "A")
                    && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Dr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            var priorCrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId)
                    && (v.VoucherStatus == "V" || v.VoucherStatus == "A")
                    && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Cr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            var accObMap = accounts.ToDictionary(
                a => a.ID,
                a => GetInitialOB(a.ID) + priorDrMap.GetValueOrDefault(a.ID) - priorCrMap.GetValueOrDefault(a.ID));

            // ── Period entries ────────────────────────────────────────────────────
            var periodEntries = await (
                from d in _db.vouchercreditdebitdetails.AsNoTracking()
                join v in _db.voucher.AsNoTracking() on d.VoucherID equals v.Id
                where accountIds.Contains(d.AccountId)
                    && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                    && d.ValueDate >= fromDate.Date && d.ValueDate < nextDay
                orderby d.ValueDate, v.VoucherNo
                select new
                {
                    d.AccountId, d.ValueDate, d.Narration,
                    d.VoucherEntryType, d.VoucherAmount, VoucherNo = v.VoucherNo,
                }
            ).ToListAsync();

            var accNameMap = accounts.ToDictionary(
                a => a.ID, a => a.AccountName ?? "");

            // NonZero: restrict to accounts that have period entries
            var activeIds = nonZero
                ? periodEntries.Select(e => e.AccountId).Distinct().ToHashSet()
                : accountIds.ToHashSet();

            var headOB = accObMap
                .Where(kv => activeIds.Contains(kv.Key))
                .Sum(kv => kv.Value);

            var filtered = periodEntries.Where(e => activeIds.Contains(e.AccountId)).ToList();

            decimal totalDr = filtered.Where(e => e.VoucherEntryType == "Dr").Sum(e => (decimal)e.VoucherAmount);
            decimal totalCr = filtered.Where(e => e.VoucherEntryType == "Cr").Sum(e => (decimal)e.VoucherAmount);

            List<HeadInDetailRowDTO> rows;
            if (consolidate)
            {
                rows = filtered
                    .GroupBy(e => e.ValueDate.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new HeadInDetailRowDTO
                    {
                        ValueDate   = g.Key,
                        Particulars = null,
                        Dr = g.Where(e => e.VoucherEntryType == "Dr").Sum(e => (decimal?)e.VoucherAmount),
                        Cr = g.Where(e => e.VoucherEntryType == "Cr").Sum(e => (decimal?)e.VoucherAmount),
                        RunningBalance = 0m,
                    })
                    .ToList();
            }
            else
            {
                rows = filtered
                    .OrderBy(e => e.ValueDate)
                    .ThenBy(e => e.VoucherNo)
                    .Select(e => new HeadInDetailRowDTO
                    {
                        ValueDate   = e.ValueDate,
                        Particulars = $"{accNameMap.GetValueOrDefault(e.AccountId, "")} Tr.No.{e.VoucherNo}{(!string.IsNullOrWhiteSpace(e.Narration) ? " " + e.Narration.Trim() : "")}",
                        Dr = e.VoucherEntryType == "Dr" ? (decimal?)e.VoucherAmount : null,
                        Cr = e.VoucherEntryType == "Cr" ? (decimal?)e.VoucherAmount : null,
                        RunningBalance = 0m,
                    })
                    .ToList();
            }

            decimal running = headOB;
            foreach (var row in rows)
            {
                running += (row.Dr ?? 0m) - (row.Cr ?? 0m);
                row.RunningBalance = running;
            }

            return (true, "Success", new HeadInDetailDTO
            {
                BranchName     = branch?.branchmaster_name ?? "",
                BranchAddress  = branch?.branchmaster_addressline ?? "",
                HeadName       = head.name,
                HeadCode       = headCode,
                TypeName       = head.TypeName,
                FromDate       = fromDate,
                ToDate         = toDate,
                OpeningBalance = headOB,
                TotalDr        = totalDr,
                TotalCr        = totalCr,
                ClosingBalance = headOB + totalDr - totalCr,
                Rows           = rows,
            });
        }

        // ── Head Ledger (Consolidate On Accounts) and Head Ledger (Accounts) ─────
        // format="consolidate": summary table — OB/Dr/Cr/CB per account, no rows.
        // format="accounts":    per-account individual ledger rows, personal accounts only
        //                       (AccTypeId in 2=Saving, 4=ShareMoney, 5=RD, 6=FD).
        // nonZero=true: exclude accounts with no period transactions.

        public async Task<(bool success, string message, HeadLedgerDTO? data)> GetHeadLedgerAsync(
            int branchId, long headCode, DateTime fromDate, DateTime toDate,
            string format = "consolidate", bool nonZero = false)
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

            if (head == null) return (false, "Account head not found.", null);

            var prefix = GetHeadPrefix(headCode);
            var allBranchHeadCodes = await _db.accounthead.AsNoTracking()
                .Where(h => h.branchid == branchId)
                .Select(h => h.headcode)
                .ToListAsync();

            var matchingHeadCodes = allBranchHeadCodes
                .Where(hc => hc.ToString().PadLeft(12, '0').StartsWith(prefix))
                .ToList();

            bool personalOnly = format == "accounts";

            var accountsQuery = _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId && matchingHeadCodes.Contains(a.HeadCode));

            if (personalOnly)
                accountsQuery = accountsQuery.Where(a => a.AccTypeId == 2 || a.AccTypeId == 4
                    || a.AccTypeId == 5 || a.AccTypeId == 6);

            var accounts = await accountsQuery
                .OrderBy(a => a.AccSuffix)
                .Select(a => new
                {
                    a.ID, a.AccountName, a.AccountNumber,
                    a.AccPrefix, a.AccSuffix, a.AccTypeId,
                    a.GeneralProductId, a.HeadCode,
                })
                .ToListAsync();

            if (!accounts.Any()) return (false, "No accounts found under this head.", null);

            var accountIds = accounts.Select(a => a.ID).ToList();
            var nextDay    = toDate.Date.AddDays(1);

            // ── Opening balances ──────────────────────────────────────────────────
            var obRecords = await _db.accopeningbalance.AsNoTracking()
                .Where(ob => accountIds.Contains(ob.AccountId) && ob.BranchId == branchId)
                .ToDictionaryAsync(ob => ob.AccountId);

            var fdObMap = new Dictionary<int, decimal>();
            {
                var fdObs = await (
                    from fd in _db.fdaccountdetail.AsNoTracking()
                    where accountIds.Contains(fd.AccountId)
                        && fd.OpeningBalance != null && fd.OpeningBalance > 0
                    select new { fd.AccountId, fd.OpeningBalance, fd.OpeningBalanceType }
                ).ToListAsync();
                foreach (var fd in fdObs)
                {
                    var amt = fd.OpeningBalance ?? 0m;
                    fdObMap[fd.AccountId] = fdObMap.GetValueOrDefault(fd.AccountId)
                        + (fd.OpeningBalanceType?.ToUpper() == "DR" ? amt : -amt);
                }
            }

            var loanObMap = new Dictionary<int, decimal>();
            {
                var loanObs = await (
                    from loan in _db.loanaccopeningbalance.AsNoTracking()
                    join acc in _db.accountmaster.AsNoTracking() on loan.AccId equals (int?)acc.ID
                    where acc.BranchId == branchId && accountIds.Contains(acc.ID)
                    select new
                    {
                        AccId = acc.ID,
                        loan.TotalBalance, loan.BalType,
                        loan.OverDueBal,   loan.OverBalType,
                        loan.OpenInt,      loan.OpenIntType,
                        loan.OpenOverInt,  loan.OpenOverIntType,
                    }
                ).ToListAsync();
                static decimal S(decimal? amt, string? t) => (amt ?? 0m) * (t?.ToUpper() == "DR" ? 1m : -1m);
                foreach (var loan in loanObs)
                    loanObMap[loan.AccId] = loanObMap.GetValueOrDefault(loan.AccId)
                        + S(loan.TotalBalance, loan.BalType) + S(loan.OverDueBal, loan.OverBalType)
                        + S(loan.OpenInt, loan.OpenIntType)  + S(loan.OpenOverInt, loan.OpenOverIntType);
            }

            decimal GetInitialOB(int accId)
            {
                if (loanObMap.TryGetValue(accId, out var lb)) return lb;
                if (fdObMap.TryGetValue(accId, out var fb))   return fb;
                var ob = obRecords.GetValueOrDefault(accId);
                if (ob == null) return 0m;
                return ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount;
            }

            var priorDrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId)
                    && (v.VoucherStatus == "V" || v.VoucherStatus == "A")
                    && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Dr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            var priorCrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId)
                    && (v.VoucherStatus == "V" || v.VoucherStatus == "A")
                    && v.ValueDate < fromDate.Date && v.VoucherEntryType == "Cr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);

            // ── Period transactions ───────────────────────────────────────────────
            Dictionary<int, decimal> periodDrMap;
            Dictionary<int, decimal> periodCrMap;
            Dictionary<int, List<HeadLedgerRowDTO>>? rowsByAcc = null;

            if (personalOnly)
            {
                var periodEntries = await (
                    from d in _db.vouchercreditdebitdetails.AsNoTracking()
                    join v in _db.voucher.AsNoTracking() on d.VoucherID equals v.Id
                    where accountIds.Contains(d.AccountId)
                        && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                        && d.ValueDate >= fromDate.Date && d.ValueDate < nextDay
                    orderby d.ValueDate, v.VoucherNo
                    select new
                    {
                        d.AccountId, d.ValueDate, d.Narration,
                        d.VoucherEntryType, d.VoucherAmount, VoucherNo = v.VoucherNo,
                    }
                ).ToListAsync();

                periodDrMap = periodEntries
                    .Where(e => e.VoucherEntryType == "Dr")
                    .GroupBy(e => e.AccountId)
                    .ToDictionary(g => g.Key, g => g.Sum(e => e.VoucherAmount));
                periodCrMap = periodEntries
                    .Where(e => e.VoucherEntryType == "Cr")
                    .GroupBy(e => e.AccountId)
                    .ToDictionary(g => g.Key, g => g.Sum(e => e.VoucherAmount));

                rowsByAcc = new Dictionary<int, List<HeadLedgerRowDTO>>();
                foreach (var grp in periodEntries.GroupBy(e => e.AccountId))
                {
                    rowsByAcc[grp.Key] = grp
                        .Select(e => new HeadLedgerRowDTO
                        {
                            ValueDate  = e.ValueDate,
                            VoucherNo  = e.VoucherNo,
                            Narration  = e.Narration,
                            Dr = e.VoucherEntryType == "Dr" ? (decimal?)e.VoucherAmount : null,
                            Cr = e.VoucherEntryType == "Cr" ? (decimal?)e.VoucherAmount : null,
                            RunningBalance = 0m,
                        })
                        .ToList();
                }
            }
            else
            {
                periodDrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(v => accountIds.Contains(v.AccountId)
                        && (v.VoucherStatus == "V" || v.VoucherStatus == "A")
                        && v.ValueDate >= fromDate.Date && v.ValueDate < nextDay
                        && v.VoucherEntryType == "Dr")
                    .GroupBy(v => v.AccountId)
                    .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                    .ToDictionaryAsync(x => x.Key, x => x.Total);

                periodCrMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(v => accountIds.Contains(v.AccountId)
                        && (v.VoucherStatus == "V" || v.VoucherStatus == "A")
                        && v.ValueDate >= fromDate.Date && v.ValueDate < nextDay
                        && v.VoucherEntryType == "Cr")
                    .GroupBy(v => v.AccountId)
                    .Select(g => new { g.Key, Total = g.Sum(v => v.VoucherAmount) })
                    .ToDictionaryAsync(x => x.Key, x => x.Total);
            }

            // ── Build per-account results ──────────────────────────────────────────
            var result = accounts.Select(a =>
            {
                decimal initialOb      = GetInitialOB(a.ID);
                decimal priorDr        = priorDrMap.GetValueOrDefault(a.ID);
                decimal priorCr        = priorCrMap.GetValueOrDefault(a.ID);
                decimal openingBalance = initialOb + priorDr - priorCr;

                decimal periodDr      = periodDrMap.GetValueOrDefault(a.ID);
                decimal periodCr      = periodCrMap.GetValueOrDefault(a.ID);
                decimal closingBalance = openingBalance + periodDr - periodCr;

                string accNo = !string.IsNullOrWhiteSpace(a.AccountNumber)
                    ? a.AccountNumber
                    : $"{a.AccPrefix}-{a.AccSuffix}";

                List<HeadLedgerRowDTO>? rows = null;
                if (rowsByAcc != null && rowsByAcc.TryGetValue(a.ID, out var rawRows))
                {
                    decimal running = openingBalance;
                    foreach (var r in rawRows)
                    {
                        running += (r.Dr ?? 0m) - (r.Cr ?? 0m);
                        r.RunningBalance = running;
                    }
                    rows = rawRows;
                }

                return new HeadLedgerAccountDTO
                {
                    AccountId      = a.ID,
                    AccountName    = a.AccountName ?? "",
                    AccountNo      = accNo,
                    OpeningBalance = openingBalance,
                    PeriodDr       = periodDr,
                    PeriodCr       = periodCr,
                    ClosingBalance = closingBalance,
                    Rows           = rows,
                };
            }).ToList();

            if (nonZero)
                result = result.Where(a => a.PeriodDr != 0 || a.PeriodCr != 0).ToList();

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
