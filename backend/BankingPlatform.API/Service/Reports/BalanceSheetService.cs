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
        public decimal GrandTotalLiabilities { get; set; }
        public decimal GrandTotalAssets { get; set; }
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

            // ── Head query: showinreport = 1 (mirrors SP ShowInReport = 1) ──────────────
            var heads = await (
                from ah in _db.accounthead.AsNoTracking()
                join aht in _db.accountheadtype.AsNoTracking()
                    on new { ah.accountheadtypeid, ah.branchid }
                    equals new { accountheadtypeid = aht.id, branchid = aht.branchid }
                where ah.branchid == branchId && ah.showinreport == 1
                select new
                {
                    ah.headcode,
                    ah.name,
                    ah.isannexure,
                    aht.categoryid,
                    typeName = aht.description,
                }
            ).ToListAsync();

            if (!heads.Any())
                return (false, "No account heads found for this branch.", null);

            // SP: BalanceSheet proc filters HeadTypeId IN (1,2); P&L proc filters IN (3,4)
            var bsHeads  = heads.Where(h => h.categoryid == 1 || h.categoryid == 2).ToList();
            var plHeads  = heads.Where(h => h.categoryid == 3 || h.categoryid == 4).ToList();

            // SP: IsAnnexure = 0 → iterate per account; IsAnnexure = 1 → head-level balance
            var ann0Heads = bsHeads.Where(h => h.isannexure == 0).ToList();
            var ann1Heads = bsHeads.Where(h => h.isannexure != 0).ToList();

            var nextDay = asOfDate.Date.AddDays(1);

            // ══════════════════════════════════════════════════════════════════════════════
            // PART A — IsAnnexure=1 BS heads + P&L heads: head-level balance
            // ══════════════════════════════════════════════════════════════════════════════

            var hlHeadCodes = ann1Heads.Select(h => h.headcode)
                .Concat(plHeads.Select(h => h.headcode))
                .Distinct().ToList();

            // Voucher totals grouped by AccHeadCode (VoucherStatus V or A — matches GetAccountBalance)
            var hlVoucherBals = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(d => d.BrId == branchId
                    && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                    && d.ValueDate < nextDay
                    && hlHeadCodes.Contains(d.AccHeadCode))
                .GroupBy(d => d.AccHeadCode)
                .Select(g => new
                {
                    HeadCode = g.Key,
                    TotalDr  = g.Where(d => d.VoucherEntryType == "Dr").Sum(d => d.VoucherAmount),
                    TotalCr  = g.Where(d => d.VoucherEntryType == "Cr").Sum(d => d.VoucherAmount),
                })
                .ToListAsync();

            var hlVoucherMap = hlVoucherBals.ToDictionary(x => x.HeadCode);

            // Opening balances for Ann1 BS heads + P&L heads (income/expense heads may have
            // accounts in accountmaster with entries in accopeningbalance)
            var ann1HeadCodes = ann1Heads.Select(h => h.headcode)
                .Concat(plHeads.Select(h => h.headcode))
                .Distinct().ToList();
            var hlObDr = new Dictionary<long, decimal>();
            var hlObCr = new Dictionary<long, decimal>();

            if (ann1HeadCodes.Any())
            {
                // 1. Standard opening balances (Saving / General / RD / ShareMoney)
                var hlAccounts = await _db.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId && ann1HeadCodes.Contains(a.HeadCode))
                    .Select(a => new { a.ID, a.HeadCode })
                    .ToListAsync();

                var hlAccIds    = hlAccounts.Select(a => a.ID).ToList();
                var hlAccHdMap  = hlAccounts.ToDictionary(a => a.ID, a => a.HeadCode);

                var hlObs = await _db.accopeningbalance.AsNoTracking()
                    .Where(ob => ob.BranchId == branchId && hlAccIds.Contains(ob.AccountId))
                    .ToListAsync();

                foreach (var ob in hlObs)
                {
                    if (!hlAccHdMap.TryGetValue(ob.AccountId, out var hc)) continue;
                    if (ob.EntryType?.ToUpper() == "DR")
                        hlObDr[hc] = hlObDr.GetValueOrDefault(hc) + ob.OpeningAmount;
                    else
                        hlObCr[hc] = hlObCr.GetValueOrDefault(hc) + ob.OpeningAmount;
                }

                // 2. FD per-detail opening balance
                var hlFdObs = await (
                    from fd in _db.fdaccountdetail.AsNoTracking()
                    join acc in _db.accountmaster.AsNoTracking() on fd.AccountId equals acc.ID
                    where acc.BranchId == branchId
                        && fd.OpeningBalance != null && fd.OpeningBalance > 0
                        && ann1HeadCodes.Contains(acc.HeadCode)
                    select new { HeadCode = acc.HeadCode, fd.OpeningBalance, fd.OpeningBalanceType }
                ).ToListAsync();

                foreach (var fd in hlFdObs)
                {
                    var amt = fd.OpeningBalance ?? 0m;
                    if (fd.OpeningBalanceType?.ToUpper() == "DR")
                        hlObDr[fd.HeadCode] = hlObDr.GetValueOrDefault(fd.HeadCode) + amt;
                    else
                        hlObCr[fd.HeadCode] = hlObCr.GetValueOrDefault(fd.HeadCode) + amt;
                }

                // 3. Loan opening balance — join via accountmaster.HeadCode
                //    loanaccopeningbalance.HeadCode is always NULL in DB; SP matches via accountmaster
                var hlLoanObsRaw = await (
                    from loan in _db.loanaccopeningbalance.AsNoTracking()
                    join acc in _db.accountmaster.AsNoTracking() on loan.AccId equals (int?)acc.ID
                    where acc.BranchId == branchId
                        && ann1HeadCodes.Contains(acc.HeadCode)
                    select new
                    {
                        loan.TotalBalance, loan.BalType,
                        loan.OverDueBal,   loan.OverBalType,
                        loan.OpenInt,      loan.OpenIntType,
                        loan.OpenOverInt,  loan.OpenOverIntType,
                        PrincipalHc = acc.HeadCode,
                        ProductId   = acc.GeneralProductId,
                    }
                ).ToListAsync();

                // RecoverableIntHeadCode per product for interest distribution
                var hlLoanProductIds = hlLoanObsRaw
                    .Where(x => x.ProductId.HasValue)
                    .Select(x => x.ProductId!.Value)
                    .Distinct().ToList();
                var hlLoanPostingMap = new Dictionary<int, long?>();
                if (hlLoanProductIds.Any())
                {
                    hlLoanPostingMap = await _db.loanproductposting.AsNoTracking()
                        .Where(p => p.BrId == branchId && hlLoanProductIds.Contains(p.ProductId))
                        .ToDictionaryAsync(p => p.ProductId, p => p.RecoverableIntHeadCode);
                }

                foreach (var item in hlLoanObsRaw)
                {
                    var hc = item.PrincipalHc;
                    long? rawIntHc = item.ProductId.HasValue
                        ? hlLoanPostingMap.GetValueOrDefault(item.ProductId!.Value)
                        : null;
                    var intHc = (rawIntHc.HasValue && rawIntHc.Value != 0) ? rawIntHc.Value : hc;

                    void AddToHl(long headCode, decimal? amount, string? balType)
                    {
                        var a = amount ?? 0m;
                        if (a == 0m) return;
                        if (balType?.ToUpper() == "DR")
                            hlObDr[headCode] = hlObDr.GetValueOrDefault(headCode) + a;
                        else
                            hlObCr[headCode] = hlObCr.GetValueOrDefault(headCode) + a;
                    }

                    // Principal + Overdue → accountmaster HeadCode
                    AddToHl(hc, item.TotalBalance, item.BalType);
                    AddToHl(hc, item.OverDueBal,   item.OverBalType);
                    // Interest → RecoverableIntHeadCode (or same head if not configured)
                    AddToHl(intHc, item.OpenInt,     item.OpenIntType);
                    AddToHl(intHc, item.OpenOverInt, item.OpenOverIntType);
                }
            }

            // ══════════════════════════════════════════════════════════════════════════════
            // PART B — IsAnnexure=0 BS heads: per-account iteration (mirrors SP loop)
            //          Tracks positive and negative account balances separately so that
            //          heads with mixed-sign accounts produce two rows (one each side).
            // ══════════════════════════════════════════════════════════════════════════════

            var ann0PosHd = new Dictionary<long, decimal>(); // sum of Dr-dominant accounts per head
            var ann0NegHd = new Dictionary<long, decimal>(); // sum of Cr-dominant accounts per head (negative values)

            if (ann0Heads.Any())
            {
                var ann0HdCodes = ann0Heads.Select(h => h.headcode).ToList();

                var ann0Accounts = await _db.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId && ann0HdCodes.Contains(a.HeadCode))
                    .Select(a => new { a.ID, a.HeadCode })
                    .ToListAsync();

                var ann0AccIds   = ann0Accounts.Select(a => a.ID).ToList();
                var ann0AccHdMap = ann0Accounts.ToDictionary(a => a.ID, a => a.HeadCode);

                // Per-account voucher balances (VoucherStatus V or A — matches GetAccountBalance)
                var ann0VchBals = await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(d => d.BrId == branchId
                        && (d.VoucherStatus == "V" || d.VoucherStatus == "A")
                        && d.ValueDate < nextDay
                        && ann0AccIds.Contains(d.AccountId))
                    .GroupBy(d => d.AccountId)
                    .Select(g => new
                    {
                        AccountId = g.Key,
                        TotalDr   = g.Where(d => d.VoucherEntryType == "Dr").Sum(d => d.VoucherAmount),
                        TotalCr   = g.Where(d => d.VoucherEntryType == "Cr").Sum(d => d.VoucherAmount),
                    })
                    .ToListAsync();

                var ann0VchMap = ann0VchBals.ToDictionary(x => x.AccountId);

                // Per-account opening balances
                var a0ObDr = new Dictionary<int, decimal>();
                var a0ObCr = new Dictionary<int, decimal>();

                var ann0Obs = await _db.accopeningbalance.AsNoTracking()
                    .Where(ob => ob.BranchId == branchId && ann0AccIds.Contains(ob.AccountId))
                    .ToListAsync();

                foreach (var ob in ann0Obs)
                {
                    if (ob.EntryType?.ToUpper() == "DR")
                        a0ObDr[ob.AccountId] = a0ObDr.GetValueOrDefault(ob.AccountId) + ob.OpeningAmount;
                    else
                        a0ObCr[ob.AccountId] = a0ObCr.GetValueOrDefault(ob.AccountId) + ob.OpeningAmount;
                }

                var ann0FdObs = await _db.fdaccountdetail.AsNoTracking()
                    .Where(fd => fd.OpeningBalance != null && fd.OpeningBalance > 0
                        && ann0AccIds.Contains(fd.AccountId))
                    .Select(fd => new { fd.AccountId, fd.OpeningBalance, fd.OpeningBalanceType })
                    .ToListAsync();

                foreach (var fd in ann0FdObs)
                {
                    var amt = fd.OpeningBalance ?? 0m;
                    if (fd.OpeningBalanceType?.ToUpper() == "DR")
                        a0ObDr[fd.AccountId] = a0ObDr.GetValueOrDefault(fd.AccountId) + amt;
                    else
                        a0ObCr[fd.AccountId] = a0ObCr.GetValueOrDefault(fd.AccountId) + amt;
                }

                // Ann0 loan OB — join via accountmaster to avoid relying on loanaccopeningbalance.BranchId
                var ann0LoanObsRaw = await (
                    from loan in _db.loanaccopeningbalance.AsNoTracking()
                    join acc in _db.accountmaster.AsNoTracking() on loan.AccId equals (int?)acc.ID
                    where acc.BranchId == branchId
                        && ann0AccIds.Contains(acc.ID)
                    select new
                    {
                        AccId        = acc.ID,
                        loan.TotalBalance, loan.BalType,
                        loan.OverDueBal,   loan.OverBalType,
                        loan.OpenInt,      loan.OpenIntType,
                        loan.OpenOverInt,  loan.OpenOverIntType,
                        ProductId    = acc.GeneralProductId,
                    }
                ).ToListAsync();
                var ann0LoanObs = ann0LoanObsRaw; // alias for readability below

                // Load RecoverableIntHeadCode per product for Ann0 loan accounts
                var loanAccProductMap = ann0LoanObsRaw
                    .Where(x => x.ProductId.HasValue)
                    .GroupBy(x => x.AccId)
                    .ToDictionary(g => g.Key, g => g.First().ProductId!.Value);

                var loanProductIds = loanAccProductMap.Values.Distinct().ToList();
                var ann0LoanPostingMap = new Dictionary<int, long?>();
                if (loanProductIds.Any())
                {
                    ann0LoanPostingMap = await _db.loanproductposting.AsNoTracking()
                        .Where(p => p.BrId == branchId && loanProductIds.Contains(p.ProductId))
                        .ToDictionaryAsync(p => p.ProductId, p => p.RecoverableIntHeadCode);
                }

                var ann0IntHeadCodes = ann0Heads.Select(h => h.headcode).ToHashSet();

                foreach (var loan in ann0LoanObs)
                {
                    var accId = loan.AccId;

                    void AddToAcc(int aId, decimal? amount, string? balType)
                    {
                        var a = amount ?? 0m;
                        if (a == 0m) return;
                        if (balType?.ToUpper() == "DR")
                            a0ObDr[aId] = a0ObDr.GetValueOrDefault(aId) + a;
                        else
                            a0ObCr[aId] = a0ObCr.GetValueOrDefault(aId) + a;
                    }

                    // Principal + Overdue → account's position (keyed by accId, rolled up to head later)
                    AddToAcc(accId, loan.TotalBalance, loan.BalType);
                    AddToAcc(accId, loan.OverDueBal,   loan.OverBalType);

                    // Interest → RecoverableIntHeadCode from product posting
                    long? intHc = null;
                    if (loanAccProductMap.TryGetValue(accId, out var prodId))
                        ann0LoanPostingMap.TryGetValue(prodId, out intHc);

                    if (intHc.HasValue && intHc.Value != 0 && !ann0IntHeadCodes.Contains(intHc.Value))
                    {
                        // Interest head is Ann1 or P&L → accumulate at head level
                        void AddToHl(long headCode, decimal? amount, string? balType)
                        {
                            var a = amount ?? 0m;
                            if (a == 0m) return;
                            if (balType?.ToUpper() == "DR")
                                hlObDr[headCode] = hlObDr.GetValueOrDefault(headCode) + a;
                            else
                                hlObCr[headCode] = hlObCr.GetValueOrDefault(headCode) + a;
                        }
                        AddToHl(intHc.Value, loan.OpenInt,     loan.OpenIntType);
                        AddToHl(intHc.Value, loan.OpenOverInt, loan.OpenOverIntType);
                    }
                    else
                    {
                        AddToAcc(accId, loan.OpenInt,     loan.OpenIntType);
                        AddToAcc(accId, loan.OpenOverInt, loan.OpenOverIntType);
                    }
                }

                // Per-account balance → accumulate to head, tracking sign separately
                foreach (var acc in ann0Accounts)
                {
                    ann0VchMap.TryGetValue(acc.ID, out var vb);
                    decimal dr      = (vb?.TotalDr ?? 0m) + a0ObDr.GetValueOrDefault(acc.ID);
                    decimal cr      = (vb?.TotalCr ?? 0m) + a0ObCr.GetValueOrDefault(acc.ID);
                    decimal netDrCr = dr - cr;

                    if (netDrCr == 0m) continue;

                    var hc = ann0AccHdMap[acc.ID];
                    if (netDrCr > 0)
                        ann0PosHd[hc] = ann0PosHd.GetValueOrDefault(hc) + netDrCr;
                    else
                        ann0NegHd[hc] = ann0NegHd.GetValueOrDefault(hc) + netDrCr; // stored as negative
                }
            }

            // ══════════════════════════════════════════════════════════════════════════════
            // Build result lines
            // ══════════════════════════════════════════════════════════════════════════════

            var allLines = new List<BalanceSheetLineDTO>();

            // Ann1 BS heads (head-level balance, side-switching by sign)
            foreach (var h in ann1Heads)
            {
                hlVoucherMap.TryGetValue(h.headcode, out var vb);
                decimal dr      = (vb?.TotalDr ?? 0m) + hlObDr.GetValueOrDefault(h.headcode);
                decimal cr      = (vb?.TotalCr ?? 0m) + hlObCr.GetValueOrDefault(h.headcode);
                decimal netDrCr = dr - cr;

                if (netDrCr == 0m) continue;

                allLines.Add(new BalanceSheetLineDTO
                {
                    HeadCode   = h.headcode,
                    HeadName   = h.name,
                    CategoryId = netDrCr > 0 ? 1 : 2,  // positive=asset(1), negative=liability(2)
                    TypeName   = h.typeName,
                    DrTotal    = dr,
                    CrTotal    = cr,
                    Balance    = Math.Abs(netDrCr),
                });
            }

            // Ann0 BS heads — may produce two rows per head when accounts are on both sides
            foreach (var h in ann0Heads)
            {
                decimal pos = ann0PosHd.GetValueOrDefault(h.headcode); // >= 0
                decimal neg = ann0NegHd.GetValueOrDefault(h.headcode); // <= 0

                if (pos == 0m && neg == 0m) continue;

                if (pos != 0m && neg != 0m)
                {
                    // Mixed: asset row for positive accounts, liability row for negative accounts
                    allLines.Add(new BalanceSheetLineDTO
                    {
                        HeadCode   = h.headcode,
                        HeadName   = h.name,
                        CategoryId = 1, // asset side
                        TypeName   = h.typeName,
                        DrTotal    = pos,
                        CrTotal    = 0m,
                        Balance    = pos,
                    });
                    allLines.Add(new BalanceSheetLineDTO
                    {
                        HeadCode   = h.headcode,
                        HeadName   = h.name,
                        CategoryId = 2, // liability side
                        TypeName   = h.typeName,
                        DrTotal    = 0m,
                        CrTotal    = Math.Abs(neg),
                        Balance    = Math.Abs(neg),
                    });
                }
                else
                {
                    decimal headBal = pos + neg;
                    allLines.Add(new BalanceSheetLineDTO
                    {
                        HeadCode   = h.headcode,
                        HeadName   = h.name,
                        CategoryId = headBal > 0 ? 1 : 2,
                        TypeName   = h.typeName,
                        DrTotal    = pos,
                        CrTotal    = Math.Abs(neg),
                        Balance    = Math.Abs(headBal),
                    });
                }
            }

            // P&L heads (income/expense — vouchers + opening balance from accountmaster if any)
            foreach (var h in plHeads)
            {
                hlVoucherMap.TryGetValue(h.headcode, out var vb);
                decimal dr = (vb?.TotalDr ?? 0m) + hlObDr.GetValueOrDefault(h.headcode);
                decimal cr = (vb?.TotalCr ?? 0m) + hlObCr.GetValueOrDefault(h.headcode);
                // Income (cat 3): Cr normal → Cr-Dr; Expense (cat 4): Dr normal → Dr-Cr
                decimal balance = h.categoryid == 4 ? (dr - cr) : (cr - dr);

                if (balance == 0m) continue;

                allLines.Add(new BalanceSheetLineDTO
                {
                    HeadCode   = h.headcode,
                    HeadName   = h.name,
                    CategoryId = h.categoryid,
                    TypeName   = h.typeName,
                    DrTotal    = dr,
                    CrTotal    = cr,
                    Balance    = balance,
                });
            }

            // ── Split and aggregate ───────────────────────────────────────────────────────

            var assets      = allLines.Where(l => l.CategoryId == 1).ToList();
            var liabilities = allLines.Where(l => l.CategoryId == 2).ToList();
            var income      = allLines.Where(l => l.CategoryId == 3).ToList();
            var expenses    = allLines.Where(l => l.CategoryId == 4).ToList();

            decimal totalAssets      = assets.Sum(l => l.Balance);
            decimal totalLiabilities = liabilities.Sum(l => l.Balance);
            decimal totalIncome      = income.Sum(l => l.Balance);
            decimal totalExpense     = expenses.Sum(l => l.Balance);
            decimal netProfit        = totalIncome - totalExpense; // positive=profit, negative=loss

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

            // SP: ProfitLoss > 0 → LOSS on asset side; ProfitLoss <= 0 → PROFIT on liability side
            // C# equivalent: netProfit < 0 → loss on asset side; netProfit > 0 → profit on liability side
            decimal grandLiabilities = totalLiabilities + (netProfit > 0 ? netProfit : 0);
            decimal grandAssets      = totalAssets      + (netProfit < 0 ? Math.Abs(netProfit) : 0);

            return (true, "Success", new BalanceSheetDTO
            {
                AsOfDate              = asOfDate,
                BranchName            = branch?.branchmaster_name ?? "",
                BranchAddress         = branch?.branchmaster_addressline ?? "",
                LiabilitySections     = ToSections(liabilities),
                AssetSections         = ToSections(assets),
                TotalLiabilities      = totalLiabilities,
                TotalAssets           = totalAssets,
                TotalIncome           = totalIncome,
                TotalExpense          = totalExpense,
                NetProfit             = netProfit,
                GrandTotalLiabilities = grandLiabilities,
                GrandTotalAssets      = grandAssets,
            });
        }
    }
}
