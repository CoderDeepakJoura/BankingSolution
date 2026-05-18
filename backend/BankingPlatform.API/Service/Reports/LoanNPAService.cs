using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class LoanNPAProductItemDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    public class LoanNPARowDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string MemberName { get; set; } = "";
        public DateTime? LoanDate { get; set; }
        public decimal LoanAmountPassed { get; set; }
        public decimal OutstandingBalance { get; set; }
        public decimal TotalRecovered { get; set; }
        public DateTime? LastRecoveryDate { get; set; }
        public int DaysOverdue { get; set; }
        public int OverdueInstallments { get; set; }
        public decimal OverdueAmount { get; set; }
        public string NpaCategory { get; set; } = "Standard";
    }

    public class LoanNPASummaryDTO
    {
        public string NpaCategory { get; set; } = "";
        public int Count { get; set; }
        public decimal TotalOutstanding { get; set; }
        public decimal TotalOverdue { get; set; }
    }

    public class LoanNPADTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime AsOfDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<LoanNPARowDTO> Rows { get; set; } = new();
        public List<LoanNPASummaryDTO> Summary { get; set; } = new();
        public decimal TotalLoanAdvanced { get; set; }
        public decimal TotalOutstanding { get; set; }
        public decimal TotalRecovered { get; set; }
        public decimal TotalOverdue { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class LoanNPAService
    {
        private readonly BankingDbContext _db;

        public LoanNPAService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<LoanNPAProductItemDTO>? data)> GetLoanProductsAsync(int branchId)
        {
            var products = await _db.loanproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new LoanNPAProductItemDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();

            return (true, "OK", products);
        }

        public async Task<(bool success, string message, LoanNPADTO? data)> GetLoanNPAAsync(
            int branchId, DateTime asOfDate, int productId, bool npaOnly)
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

            // Active loan accounts
            var loanAccQuery = _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId
                    && a.AccTypeId == (int)Enums.AccountTypes.Loan
                    && !a.IsAccClosed);

            if (productId > 0)
                loanAccQuery = loanAccQuery.Where(a => a.GeneralProductId == productId);

            var loanAccounts = await loanAccQuery
                .Select(a => new { a.ID, a.AccountNumber, a.AccountName, a.MemberId, a.AccOpeningDate })
                .ToListAsync();

            var emptyResult = new LoanNPADTO
            {
                BranchName = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                AsOfDate = asOfDate,
                ProductName = productName
            };

            if (!loanAccounts.Any())
                return (true, "No active loan accounts found.", emptyResult);

            var accountIds = loanAccounts.Select(a => a.ID).ToList();
            var memberIds = loanAccounts.Where(a => a.MemberId.HasValue).Select(a => a.MemberId!.Value).Distinct().ToList();

            // Member names
            var memberNameMap = await _db.member.AsNoTracking()
                .Where(m => memberIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Id, m => m.MemberName);

            // Opening balances
            var obMap = await _db.loanaccopeningbalance.AsNoTracking()
                .Where(ob => ob.BranchId == branchId && ob.AccId.HasValue && accountIds.Contains(ob.AccId.Value))
                .ToDictionaryAsync(ob => ob.AccId!.Value, ob => ob);

            // Kist details (loan terms)
            var kistDetailMap = await _db.accountkistdetail.AsNoTracking()
                .Where(k => k.BrId == branchId && accountIds.Contains(k.AccountId))
                .ToDictionaryAsync(k => k.AccountId, k => k);

            // All voucher entries up to and including asOfDate
            var nextDay = asOfDate.Date.AddDays(1);
            var entrySummaries = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == branchId
                    && accountIds.Contains(v.AccountId)
                    && v.ValueDate < nextDay)
                .GroupBy(v => new { v.AccountId, v.VoucherEntryType })
                .Select(g => new
                {
                    g.Key.AccountId,
                    g.Key.VoucherEntryType,
                    Total = g.Sum(v => v.VoucherAmount),
                    LastDate = g.Max(v => v.ValueDate)
                })
                .ToListAsync();

            var drMap = entrySummaries.Where(e => e.VoucherEntryType == "Dr")
                .ToDictionary(e => e.AccountId, e => e.Total);
            var crMap = entrySummaries.Where(e => e.VoucherEntryType == "Cr")
                .ToDictionary(e => e.AccountId, e => e.Total);
            var lastCrDateMap = entrySummaries.Where(e => e.VoucherEntryType == "Cr")
                .ToDictionary(e => e.AccountId, e => e.LastDate);

            // Kist schedules (all, for per-account overdue calculation)
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

            var rows = new List<LoanNPARowDTO>();

            foreach (var acc in loanAccounts)
            {
                var ob = obMap.GetValueOrDefault(acc.ID);
                decimal initial = ob == null ? 0m
                    : (ob.BalType?.ToUpper() == "DR" ? (ob.TotalBalance ?? 0m) : -(ob.TotalBalance ?? 0m));

                decimal drSum = drMap.GetValueOrDefault(acc.ID);
                decimal crSum = crMap.GetValueOrDefault(acc.ID);
                decimal outstanding = initial + drSum - crSum;

                // Skip accounts with no outstanding balance
                if (outstanding <= 0m) continue;

                var kistDet = kistDetailMap.GetValueOrDefault(acc.ID);
                decimal loanAmount = (decimal)(kistDet?.LoanAmountPassed ?? 0);
                DateTime? loanDate = kistDet?.LoanDate;
                DateTime? lastRecovery = lastCrDateMap.GetValueOrDefault(acc.ID);

                // Determine overdue start date via kist schedule
                DateTime? overdueFromDate = null;
                int overdueInstallments = 0;
                decimal overdueAmount = 0m;

                var kists = kistByAccount.GetValueOrDefault(acc.ID);
                if (kists != null)
                {
                    decimal cumDue = 0m;
                    foreach (var kist in kists)
                    {
                        if (kist.Date > asOfDate.Date) break;
                        cumDue += kist.KistAmt;
                        if (cumDue > crSum && overdueFromDate == null)
                            overdueFromDate = kist.Date;
                    }
                    overdueAmount = Math.Max(0m, cumDue - crSum);
                    overdueInstallments = overdueFromDate.HasValue
                        ? kists.Count(k => k.Date >= overdueFromDate && k.Date <= asOfDate.Date)
                        : 0;
                }

                // Fallback: if no kist schedule, use days since last recovery or loan date
                int daysOverdue;
                if (overdueFromDate.HasValue)
                {
                    daysOverdue = (int)(asOfDate.Date - overdueFromDate.Value.Date).TotalDays;
                }
                else if (lastRecovery.HasValue)
                {
                    // No kist schedule — use days since last recovery as proxy
                    daysOverdue = (int)(asOfDate.Date - lastRecovery.Value.Date).TotalDays;
                }
                else
                {
                    daysOverdue = loanDate.HasValue
                        ? (int)(asOfDate.Date - loanDate.Value.Date).TotalDays
                        : 0;
                }

                if (daysOverdue < 0) daysOverdue = 0;

                string npaCategory = daysOverdue switch
                {
                    < 90  => "Standard",
                    < 366 => "Sub-Standard",
                    < 731 => "Doubtful",
                    _     => "Loss"
                };

                if (npaOnly && npaCategory == "Standard") continue;

                rows.Add(new LoanNPARowDTO
                {
                    AccountId         = acc.ID,
                    AccountNumber     = acc.AccountNumber ?? "",
                    AccountName       = acc.AccountName ?? "",
                    MemberName        = acc.MemberId.HasValue ? memberNameMap.GetValueOrDefault(acc.MemberId.Value, "") : "",
                    LoanDate          = loanDate,
                    LoanAmountPassed  = loanAmount,
                    OutstandingBalance = outstanding,
                    TotalRecovered    = crSum,
                    LastRecoveryDate  = lastRecovery,
                    DaysOverdue       = daysOverdue,
                    OverdueInstallments = overdueInstallments,
                    OverdueAmount     = overdueAmount,
                    NpaCategory       = npaCategory,
                });
            }

            rows = rows.OrderByDescending(r => r.DaysOverdue).ThenBy(r => r.AccountNumber).ToList();

            var categoryOrder = new Dictionary<string, int>
            {
                ["Standard"] = 0, ["Sub-Standard"] = 1, ["Doubtful"] = 2, ["Loss"] = 3
            };

            var summary = rows
                .GroupBy(r => r.NpaCategory)
                .Select(g => new LoanNPASummaryDTO
                {
                    NpaCategory    = g.Key,
                    Count          = g.Count(),
                    TotalOutstanding = g.Sum(r => r.OutstandingBalance),
                    TotalOverdue   = g.Sum(r => r.OverdueAmount),
                })
                .OrderBy(s => categoryOrder.GetValueOrDefault(s.NpaCategory, 99))
                .ToList();

            return (true, "Success", new LoanNPADTO
            {
                BranchName       = branch?.branchmaster_name ?? "",
                BranchAddress    = branch?.branchmaster_addressline ?? "",
                AsOfDate         = asOfDate,
                ProductName      = productName,
                Rows             = rows,
                Summary          = summary,
                TotalLoanAdvanced = rows.Sum(r => r.LoanAmountPassed),
                TotalOutstanding = rows.Sum(r => r.OutstandingBalance),
                TotalRecovered   = rows.Sum(r => r.TotalRecovered),
                TotalOverdue     = rows.Sum(r => r.OverdueAmount),
            });
        }
    }
}
