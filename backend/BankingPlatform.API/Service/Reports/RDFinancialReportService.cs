using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class RDFinRowDTO
    {
        public int? AccId { get; set; }
        public string Name { get; set; } = "";
        public decimal PeriodDr { get; set; }
        public decimal PeriodCr { get; set; }
        /// <summary>Positive = Cr balance, negative = Dr balance (standard banking sign)</summary>
        public decimal ClosingBalance { get; set; }
        /// <summary>"A" = individual account row, "H" = annexure head-level row</summary>
        public string AccOrHead { get; set; } = "A";
        public int HeadId { get; set; }
        public string HeadName { get; set; } = "";
        public int CategoryId { get; set; }
        public string TypeName { get; set; } = "";
    }

    public class RDFinancialReportDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public bool ShowAllClBal { get; set; }
        public List<RDFinRowDTO> Rows { get; set; } = new();
        public decimal TotalPeriodDr { get; set; }
        public decimal TotalPeriodCr { get; set; }
        public decimal TotalClosingCr { get; set; }
        public decimal TotalClosingDr { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class RDFinancialReportService
    {
        private readonly BankingDbContext _db;

        public RDFinancialReportService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, RDFinancialReportDTO? data)> GetAsync(
            int branchId, DateTime fromDate, DateTime toDate, bool showAllClBal)
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            // ── Account heads where showinreport = 1 ─────────────────────────────────────
            var heads = await (
                from ah in _db.accounthead.AsNoTracking()
                join aht in _db.accountheadtype.AsNoTracking()
                    on new { ah.accountheadtypeid, ah.branchid }
                    equals new { accountheadtypeid = aht.id, branchid = aht.branchid }
                where ah.branchid == branchId && ah.showinreport == 1
                orderby aht.categoryid, ah.headcode
                select new
                {
                    ah.id,
                    ah.headcode,
                    ah.name,
                    ah.isannexure,
                    CategoryId = aht.categoryid,
                    TypeName = aht.description,
                }
            ).ToListAsync();

            // Mirror SP: LEFT(CAST(HeadCode,3)) <> 110 — exclude Cash/Bank head family from main loop
            heads = heads.Where(h => !h.headcode.ToString().PadLeft(12, '0').StartsWith("110")).ToList();

            if (!heads.Any())
                return (false, "No account heads configured to show in report for this branch.", null);

            var nextDay = toDate.Date.AddDays(1);

            var nonAnnHeads = heads.Where(h => h.isannexure != 1).ToList();
            var annHeads    = heads.Where(h => h.isannexure == 1).ToList();

            var rows = new List<RDFinRowDTO>();

            // ══════════════════════════════════════════════════════════════════════════════
            // PART A — Non-annexure heads: per-account Dr/Cr + closing balance
            // ══════════════════════════════════════════════════════════════════════════════

            if (nonAnnHeads.Any())
            {
                var nonAnnHdCodes = nonAnnHeads.Select(h => h.headcode).ToList();
                var headById = nonAnnHeads.ToDictionary(h => h.headcode);

                // All accounts under these heads
                var accounts = await _db.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId && nonAnnHdCodes.Contains(a.HeadCode))
                    .Select(a => new { a.ID, a.AccountName, a.HeadCode })
                    .ToListAsync();

                if (accounts.Any())
                {
                    var accIds = accounts.Select(a => a.ID).ToList();

                    // Period Dr/Cr grouped by AccountId
                    var periodBals = await _db.vouchercreditdebitdetails.AsNoTracking()
                        .Where(d => d.BrId == branchId
                            && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                            && d.ValueDate >= fromDate.Date
                            && d.ValueDate < nextDay
                            && accIds.Contains(d.AccountId))
                        .GroupBy(d => d.AccountId)
                        .Select(g => new
                        {
                            AccountId = g.Key,
                            Dr = g.Where(d => d.VoucherEntryType == "Dr").Sum(d => d.VoucherAmount),
                            Cr = g.Where(d => d.VoucherEntryType == "Cr").Sum(d => d.VoucherAmount),
                        })
                        .ToListAsync();

                    // Closing Dr/Cr (all transactions up to toDate)
                    var closeBals = await _db.vouchercreditdebitdetails.AsNoTracking()
                        .Where(d => d.BrId == branchId
                            && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                            && d.ValueDate < nextDay
                            && accIds.Contains(d.AccountId))
                        .GroupBy(d => d.AccountId)
                        .Select(g => new
                        {
                            AccountId = g.Key,
                            TotalDr = g.Where(d => d.VoucherEntryType == "Dr").Sum(d => d.VoucherAmount),
                            TotalCr = g.Where(d => d.VoucherEntryType == "Cr").Sum(d => d.VoucherAmount),
                        })
                        .ToListAsync();

                    // Standard opening balances (Saving/General/RD/ShareMoney)
                    var obs = await _db.accopeningbalance.AsNoTracking()
                        .Where(ob => ob.BranchId == branchId && accIds.Contains(ob.AccountId))
                        .ToListAsync();
                    var obCrByAcc = obs
                        .Where(ob => ob.EntryType?.ToUpper() != "DR")
                        .GroupBy(ob => ob.AccountId)
                        .ToDictionary(g => g.Key, g => g.Sum(ob => ob.OpeningAmount));
                    var obDrByAcc = obs
                        .Where(ob => ob.EntryType?.ToUpper() == "DR")
                        .GroupBy(ob => ob.AccountId)
                        .ToDictionary(g => g.Key, g => g.Sum(ob => ob.OpeningAmount));

                    // FD per-detail opening balances (fd accounts may have per-detail OB)
                    var fdObs = await _db.fdaccountdetail.AsNoTracking()
                        .Where(fd => fd.OpeningBalance != null && fd.OpeningBalance > 0
                            && accIds.Contains(fd.AccountId))
                        .Select(fd => new { fd.AccountId, fd.OpeningBalance, fd.OpeningBalanceType })
                        .ToListAsync();
                    foreach (var fd in fdObs)
                    {
                        var amt = fd.OpeningBalance ?? 0m;
                        if (fd.OpeningBalanceType?.ToUpper() == "DR")
                            obDrByAcc[fd.AccountId] = obDrByAcc.GetValueOrDefault(fd.AccountId) + amt;
                        else
                            obCrByAcc[fd.AccountId] = obCrByAcc.GetValueOrDefault(fd.AccountId) + amt;
                    }

                    var periodByAcc  = periodBals.ToDictionary(x => x.AccountId);
                    var closeByAcc   = closeBals.ToDictionary(x => x.AccountId);

                    foreach (var acc in accounts)
                    {
                        periodByAcc.TryGetValue(acc.ID, out var p);
                        var pDr = p?.Dr ?? 0m;
                        var pCr = p?.Cr ?? 0m;

                        // Filter
                        if (!showAllClBal && pDr == 0m && pCr == 0m) continue;

                        closeByAcc.TryGetValue(acc.ID, out var c);
                        var cDr = c?.TotalDr ?? 0m;
                        var cCr = c?.TotalCr ?? 0m;
                        decimal obCr = obCrByAcc.GetValueOrDefault(acc.ID);
                        decimal obDr = obDrByAcc.GetValueOrDefault(acc.ID);
                        // closing balance: positive = Cr (standard banking sign)
                        decimal closingBal = (obCr - obDr) + cCr - cDr;

                        if (showAllClBal && pDr == 0m && pCr == 0m && closingBal == 0m) continue;

                        var head = headById[acc.HeadCode];
                        rows.Add(new RDFinRowDTO
                        {
                            AccId          = acc.ID,
                            Name           = acc.AccountName ?? "",
                            PeriodDr       = pDr,
                            PeriodCr       = pCr,
                            ClosingBalance = closingBal,
                            AccOrHead      = "A",
                            HeadId         = head.id,
                            HeadName       = head.name,
                            CategoryId     = head.CategoryId,
                            TypeName       = head.TypeName,
                        });
                    }
                }
            }

            // ══════════════════════════════════════════════════════════════════════════════
            // PART B — Annexure heads: head-level Dr/Cr using prefix matching (mirrors SP)
            // ══════════════════════════════════════════════════════════════════════════════

            if (annHeads.Any())
            {
                static string GetPrefix(long headcode)
                {
                    var s = headcode.ToString().PadLeft(12, '0');
                    if (s[3..] == "000000000") return s[..3];
                    if (s[6..] == "000000")    return s[..6];
                    if (s[9..] == "000")       return s[..9];
                    return s;
                }

                var prefixEntries = annHeads
                    .Select(h => (Hc: h.headcode, Prefix: GetPrefix(h.headcode)))
                    .ToList();

                var allBranchHcs = await _db.accounthead.AsNoTracking()
                    .Where(h => h.branchid == branchId)
                    .Select(h => h.headcode)
                    .ToListAsync();

                var childToParent = new Dictionary<long, long>();
                foreach (var childHc in allBranchHcs)
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

                // Period Dr/Cr per child head code, then aggregate to parent
                var annPeriodRaw = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(d => d.BrId == branchId
                        && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                        && d.ValueDate >= fromDate.Date
                        && d.ValueDate < nextDay
                        && expandedHcs.Contains(d.AccHeadCode))
                    .GroupBy(d => d.AccHeadCode)
                    .Select(g => new
                    {
                        HeadCode = g.Key,
                        Dr = g.Where(d => d.VoucherEntryType == "Dr").Sum(d => d.VoucherAmount),
                        Cr = g.Where(d => d.VoucherEntryType == "Cr").Sum(d => d.VoucherAmount),
                    })
                    .ToListAsync();

                var annCloseRaw = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(d => d.BrId == branchId
                        && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                        && d.ValueDate < nextDay
                        && expandedHcs.Contains(d.AccHeadCode))
                    .GroupBy(d => d.AccHeadCode)
                    .Select(g => new
                    {
                        HeadCode = g.Key,
                        TotalDr = g.Where(d => d.VoucherEntryType == "Dr").Sum(d => d.VoucherAmount),
                        TotalCr = g.Where(d => d.VoucherEntryType == "Cr").Sum(d => d.VoucherAmount),
                    })
                    .ToListAsync();

                // Aggregate to parent reporting head
                var annPeriodDr = new Dictionary<long, decimal>();
                var annPeriodCr = new Dictionary<long, decimal>();
                foreach (var v in annPeriodRaw)
                {
                    if (!childToParent.TryGetValue(v.HeadCode, out var ph)) continue;
                    annPeriodDr[ph] = annPeriodDr.GetValueOrDefault(ph) + v.Dr;
                    annPeriodCr[ph] = annPeriodCr.GetValueOrDefault(ph) + v.Cr;
                }

                var annCloseDr = new Dictionary<long, decimal>();
                var annCloseCr = new Dictionary<long, decimal>();
                foreach (var v in annCloseRaw)
                {
                    if (!childToParent.TryGetValue(v.HeadCode, out var ph)) continue;
                    annCloseDr[ph] = annCloseDr.GetValueOrDefault(ph) + v.TotalDr;
                    annCloseCr[ph] = annCloseCr.GetValueOrDefault(ph) + v.TotalCr;
                }

                // Opening balances for accounts under annexure heads
                var annAccIds = await _db.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId && expandedHcs.Contains(a.HeadCode))
                    .Select(a => new { a.ID, a.HeadCode })
                    .ToListAsync();

                var annObDr = new Dictionary<long, decimal>();
                var annObCr = new Dictionary<long, decimal>();

                if (annAccIds.Any())
                {
                    var annAccIdList  = annAccIds.Select(a => a.ID).ToList();
                    var annAccHcMap   = annAccIds.ToDictionary(a => a.ID, a => a.HeadCode);

                    var annObs = await _db.accopeningbalance.AsNoTracking()
                        .Where(ob => ob.BranchId == branchId && annAccIdList.Contains(ob.AccountId))
                        .ToListAsync();

                    foreach (var ob in annObs)
                    {
                        if (!annAccHcMap.TryGetValue(ob.AccountId, out var childHc)) continue;
                        if (!childToParent.TryGetValue(childHc, out var ph)) continue;
                        if (ob.EntryType?.ToUpper() == "DR")
                            annObDr[ph] = annObDr.GetValueOrDefault(ph) + ob.OpeningAmount;
                        else
                            annObCr[ph] = annObCr.GetValueOrDefault(ph) + ob.OpeningAmount;
                    }

                    var annFdObs = await _db.fdaccountdetail.AsNoTracking()
                        .Where(fd => fd.OpeningBalance != null && fd.OpeningBalance > 0
                            && annAccIdList.Contains(fd.AccountId))
                        .Select(fd => new { fd.AccountId, fd.OpeningBalance, fd.OpeningBalanceType })
                        .ToListAsync();

                    foreach (var fd in annFdObs)
                    {
                        if (!annAccHcMap.TryGetValue(fd.AccountId, out var childHc)) continue;
                        if (!childToParent.TryGetValue(childHc, out var ph)) continue;
                        var amt = fd.OpeningBalance ?? 0m;
                        if (fd.OpeningBalanceType?.ToUpper() == "DR")
                            annObDr[ph] = annObDr.GetValueOrDefault(ph) + amt;
                        else
                            annObCr[ph] = annObCr.GetValueOrDefault(ph) + amt;
                    }
                }

                foreach (var head in annHeads)
                {
                    var hc   = head.headcode;
                    var pDr  = annPeriodDr.GetValueOrDefault(hc);
                    var pCr  = annPeriodCr.GetValueOrDefault(hc);

                    if (!showAllClBal && pDr == 0m && pCr == 0m) continue;

                    decimal closingBal = (annObCr.GetValueOrDefault(hc) - annObDr.GetValueOrDefault(hc))
                                       + annCloseCr.GetValueOrDefault(hc)
                                       - annCloseDr.GetValueOrDefault(hc);

                    if (showAllClBal && pDr == 0m && pCr == 0m && closingBal == 0m) continue;

                    rows.Add(new RDFinRowDTO
                    {
                        AccId          = null,
                        Name           = head.name,
                        PeriodDr       = pDr,
                        PeriodCr       = pCr,
                        ClosingBalance = closingBal,
                        AccOrHead      = "H",
                        HeadId         = head.id,
                        HeadName       = head.name,
                        CategoryId     = head.CategoryId,
                        TypeName       = head.TypeName,
                    });
                }
            }

            // Totals computed before Cash Head row so it doesn't inflate the period sums
            var totalDr  = rows.Sum(r => r.PeriodDr);
            var totalCr  = rows.Sum(r => r.PeriodCr);
            var totalClCr = rows.Sum(r => r.ClosingBalance > 0 ? r.ClosingBalance : 0m);
            var totalClDr = rows.Sum(r => r.ClosingBalance < 0 ? Math.Abs(r.ClosingBalance) : 0m);

            // ── PART C — Cash Head special row (mirrors SP lines 46747–46755) ─────────────
            // Dr column repurposed → closing cash balance at ToDate
            // Cr column repurposed → opening/beginning cash balance at FromDate
            {
                const long cashMin = 110_000_000_000L;
                const long cashMax = 110_999_999_999L;

                var cashAccIds = await _db.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId && a.HeadCode >= cashMin && a.HeadCode <= cashMax)
                    .Select(a => a.ID)
                    .ToListAsync();

                decimal cashObCr = 0m, cashObDr = 0m;
                if (cashAccIds.Any())
                {
                    var cashObs = await _db.accopeningbalance.AsNoTracking()
                        .Where(ob => ob.BranchId == branchId && cashAccIds.Contains(ob.AccountId))
                        .ToListAsync();
                    cashObCr = cashObs.Where(ob => ob.EntryType?.ToUpper() != "DR").Sum(ob => ob.OpeningAmount);
                    cashObDr = cashObs.Where(ob => ob.EntryType?.ToUpper() == "DR").Sum(ob => ob.OpeningAmount);
                }

                var cashVcToDate = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(d => d.BrId == branchId
                        && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                        && d.ValueDate < nextDay
                        && d.AccHeadCode >= cashMin && d.AccHeadCode <= cashMax)
                    .GroupBy(d => d.VoucherEntryType)
                    .Select(g => new { Type = g.Key, Total = g.Sum(d => d.VoucherAmount) })
                    .ToListAsync();

                var fromNextDay = fromDate.Date.AddDays(1);
                var cashVcFromDate = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(d => d.BrId == branchId
                        && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                        && d.ValueDate < fromNextDay
                        && d.AccHeadCode >= cashMin && d.AccHeadCode <= cashMax)
                    .GroupBy(d => d.VoucherEntryType)
                    .Select(g => new { Type = g.Key, Total = g.Sum(d => d.VoucherAmount) })
                    .ToListAsync();

                decimal closingCashBal = (cashObCr - cashObDr)
                    + (cashVcToDate.FirstOrDefault(x => x.Type == "Cr")?.Total ?? 0m)
                    - (cashVcToDate.FirstOrDefault(x => x.Type == "Dr")?.Total ?? 0m);

                decimal openingCashBal = (cashObCr - cashObDr)
                    + (cashVcFromDate.FirstOrDefault(x => x.Type == "Cr")?.Total ?? 0m)
                    - (cashVcFromDate.FirstOrDefault(x => x.Type == "Dr")?.Total ?? 0m);

                rows.Add(new RDFinRowDTO
                {
                    AccId          = null,
                    Name           = "Cash Head",
                    PeriodDr       = closingCashBal,    // closing cash balance at ToDate
                    PeriodCr       = openingCashBal,    // opening cash balance at FromDate
                    ClosingBalance = 0m,
                    AccOrHead      = "",
                    HeadId         = 0,
                    HeadName       = "",
                    CategoryId     = 0,
                    TypeName       = "",
                });
            }

            return (true, "OK", new RDFinancialReportDTO
            {
                BranchName      = branch?.branchmaster_name ?? "",
                BranchAddress   = branch?.branchmaster_addressline ?? "",
                FromDate        = fromDate,
                ToDate          = toDate,
                ShowAllClBal    = showAllClBal,
                Rows            = rows,
                TotalPeriodDr   = totalDr,
                TotalPeriodCr   = totalCr,
                TotalClosingCr  = totalClCr,
                TotalClosingDr  = totalClDr,
            });
        }
    }
}
