using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class LoanOverdueProductItemDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    public class LoanOverdueRowDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public DateTime? OpeningDate { get; set; }
        public decimal OutstandingPrincipal { get; set; }
        public decimal OutstandingInterest { get; set; }
        public decimal OverdueAmount { get; set; }
        public decimal KistAmount { get; set; }
        public int OverdueInstallments { get; set; }
        public string Guarantor1 { get; set; } = "";
        public string Guarantor2 { get; set; } = "";
    }

    public class LoanOverdueDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime AsOfDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<LoanOverdueRowDTO> Rows { get; set; } = new();
        public int TotalAccounts { get; set; }
        public decimal TotalPrincipal { get; set; }
        public decimal TotalInterest { get; set; }
        public decimal TotalOverdue { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class LoanOverdueReportService
    {
        private readonly BankingDbContext _db;

        public LoanOverdueReportService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<LoanOverdueProductItemDTO>? data)> GetLoanProductsAsync(int branchId)
        {
            var products = await _db.loanproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new LoanOverdueProductItemDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();

            return (true, "OK", products);
        }

        public async Task<(bool success, string message, LoanOverdueDTO? data)> GetLoanOverdueAsync(
            int branchId, DateTime asOfDate, int productId, bool overdueOnly)
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "";
            if (productId > 0)
            {
                var prod = await _db.loanproduct.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == productId && p.BrId == branchId);
                productName = prod?.ProductName ?? "";
            }

            var loanAccQuery = _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId
                    && a.AccTypeId == (int)Enums.AccountTypes.Loan
                    && a.IsAccClosed != true);

            if (productId > 0)
                loanAccQuery = loanAccQuery.Where(a => a.GeneralProductId == productId);

            var loanAccounts = await loanAccQuery
                .OrderBy(a => a.AccountNumber)
                .Select(a => new { a.ID, a.AccountNumber, a.AccountName, a.AccOpeningDate })
                .ToListAsync();

            var emptyResult = new LoanOverdueDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                AsOfDate      = asOfDate,
                ProductName   = productName
            };

            if (!loanAccounts.Any())
                return (true, "No active loan accounts found.", emptyResult);

            var accountIds = loanAccounts.Select(a => a.ID).ToList();
            var nextDay    = asOfDate.Date.AddDays(1);

            // Opening balances
            var obMap = await _db.loanaccopeningbalance.AsNoTracking()
                .Where(ob => ob.BranchId == branchId && ob.AccId.HasValue && accountIds.Contains(ob.AccId.Value))
                .ToDictionaryAsync(ob => ob.AccId!.Value, ob => ob);

            // Voucher Dr / Cr sums (principal movements from vouchers)
            var entrySummaries = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == branchId
                    && accountIds.Contains(v.AccountId)
                    && v.ValueDate < nextDay)
                .GroupBy(v => new { v.AccountId, v.VoucherEntryType })
                .Select(g => new
                {
                    g.Key.AccountId,
                    g.Key.VoucherEntryType,
                    Total = g.Sum(v => v.VoucherAmount)
                })
                .ToListAsync();

            var drMap = entrySummaries.Where(e => e.VoucherEntryType == "Dr")
                .ToDictionary(e => e.AccountId, e => e.Total);
            var crMap = entrySummaries.Where(e => e.VoucherEntryType == "Cr")
                .ToDictionary(e => e.AccountId, e => e.Total);

            // Kist schedules for overdue instalment calculation
            var rawKistSchedules = await _db.accountkistschedule.AsNoTracking()
                .Where(k => k.BrId == branchId
                    && k.LoanAccId.HasValue
                    && accountIds.Contains(k.LoanAccId.Value)
                    && k.Date.HasValue)
                .Select(k => new { k.LoanAccId, k.Date, KistAmt = k.KistAmount ?? 0m })
                .ToListAsync();

            var kistByAccount = rawKistSchedules
                .GroupBy(k => k.LoanAccId!.Value)
                .ToDictionary(g => g.Key, g => g.OrderBy(k => k.Date).ToList());

            // Kist details (for installment amount column)
            var kistDetailMap = await _db.accountkistdetail.AsNoTracking()
                .Where(k => k.BrId == branchId && accountIds.Contains(k.AccountId))
                .ToDictionaryAsync(k => k.AccountId, k => k);

            // Cat3 outstanding interest (formally posted IP voucher interest, not yet recovered)
            var cat3Map = await _db.loanaccountrecoveryinterest.AsNoTracking()
                .Where(ri => ri.BrId == branchId
                    && accountIds.Contains(ri.AccId)
                    && ri.IntCategoryId == 3
                    && (ri.ValueDate == null || ri.ValueDate < nextDay))
                .GroupBy(ri => ri.AccId)
                .Select(g => new { AccId = g.Key, Dr = g.Sum(ri => ri.AmountDr), Cr = g.Sum(ri => ri.AmountCr) })
                .ToDictionaryAsync(x => x.AccId, x => Math.Max(0m, x.Dr - x.Cr));

            // Guarantors
            var guarMap = await _db.loanguarwitness.AsNoTracking()
                .Where(g => g.BrId == branchId && g.LoanAccId.HasValue && accountIds.Contains(g.LoanAccId.Value))
                .ToDictionaryAsync(g => g.LoanAccId!.Value, g => g);

            var guarMemberIds = guarMap.Values
                .SelectMany(g => new[] { g.Guar1MemId, g.Guar2MemId })
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();

            var guarMemberNames = await _db.member.AsNoTracking()
                .Where(m => guarMemberIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Id, m => m.MemberName ?? "");

            var rows = new List<LoanOverdueRowDTO>();

            foreach (var acc in loanAccounts)
            {
                var ob      = obMap.GetValueOrDefault(acc.ID);
                decimal initial = ob == null ? 0m
                    : (ob.BalType?.ToUpper() == "DR" ? (ob.TotalBalance ?? 0m) : -(ob.TotalBalance ?? 0m));

                decimal drSum      = drMap.GetValueOrDefault(acc.ID);
                decimal crSum      = crMap.GetValueOrDefault(acc.ID);
                decimal outstanding = initial + drSum - crSum;

                if (outstanding <= 0m) continue;

                // Overdue calculation using kist schedule
                decimal overdueAmount     = 0m;
                int     overdueInstalment = 0;
                var     kists             = kistByAccount.GetValueOrDefault(acc.ID);

                if (kists != null)
                {
                    decimal cumDue       = 0m;
                    DateTime? odFromDate = null;
                    foreach (var kist in kists)
                    {
                        if (kist.Date > asOfDate.Date) break;
                        cumDue += kist.KistAmt;
                        if (cumDue > crSum && odFromDate == null)
                            odFromDate = kist.Date;
                    }
                    overdueAmount     = Math.Max(0m, cumDue - crSum);
                    overdueInstalment = odFromDate.HasValue
                        ? kists.Count(k => k.Date >= odFromDate && k.Date <= asOfDate.Date)
                        : 0;
                }

                if (overdueOnly && overdueAmount <= 0m) continue;

                // Interest
                decimal cat3Interest = cat3Map.GetValueOrDefault(acc.ID, 0m);

                // Instalment amount
                var kistDet   = kistDetailMap.GetValueOrDefault(acc.ID);
                decimal kistAmt = kistDet?.KistAmount.HasValue == true ? (decimal)kistDet.KistAmount.Value : 0m;

                // Guarantors
                string guar1 = "", guar2 = "";
                if (guarMap.TryGetValue(acc.ID, out var gw))
                {
                    if (gw.Guar1MemId.HasValue)
                        guar1 = guarMemberNames.GetValueOrDefault(gw.Guar1MemId.Value, "");
                    if (gw.Guar2MemId.HasValue)
                        guar2 = guarMemberNames.GetValueOrDefault(gw.Guar2MemId.Value, "");
                }

                rows.Add(new LoanOverdueRowDTO
                {
                    AccountId            = acc.ID,
                    AccountNumber        = acc.AccountNumber ?? "",
                    AccountName          = acc.AccountName  ?? "",
                    OpeningDate          = acc.AccOpeningDate,
                    OutstandingPrincipal = outstanding,
                    OutstandingInterest  = cat3Interest,
                    OverdueAmount        = overdueAmount,
                    KistAmount           = kistAmt,
                    OverdueInstallments  = overdueInstalment,
                    Guarantor1           = guar1,
                    Guarantor2           = guar2,
                });
            }

            return (true, "Success", new LoanOverdueDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                AsOfDate      = asOfDate,
                ProductName   = productName,
                Rows          = rows,
                TotalAccounts = rows.Count,
                TotalPrincipal = rows.Sum(r => r.OutstandingPrincipal),
                TotalInterest  = rows.Sum(r => r.OutstandingInterest),
                TotalOverdue   = rows.Sum(r => r.OverdueAmount),
            });
        }
    }
}
