using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class LoanDemandRowDTO
    {
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public DateTime? LoanDate { get; set; }
        public double? LoanAmount { get; set; }
        public int KistNumber { get; set; }
        public DateTime? KistDate { get; set; }
        public decimal KistAmount { get; set; }
        public decimal PrincipalAmt { get; set; }
        public decimal InterestAmt { get; set; }
        public string Status { get; set; } = "Pending";
    }

    public class LoanDemandDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<LoanDemandRowDTO> Rows { get; set; } = new();
        public decimal TotalKistAmount { get; set; }
        public decimal TotalPrincipal { get; set; }
        public decimal TotalInterest { get; set; }
        public int PaidCount { get; set; }
        public int PendingCount { get; set; }
    }

    public class LoanDemandService
    {
        private readonly BankingDbContext _db;
        public LoanDemandService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<LoanAdvancementProductDTO>? data)> GetLoanProductsAsync(int branchId)
        {
            var products = await _db.loanproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new LoanAdvancementProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, LoanDemandDTO? data)> GetLoanDemandAsync(
            int branchId, DateTime fromDate, DateTime toDate, int productId, bool showPendingOnly)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "";
            if (productId > 0)
            {
                var p = await _db.loanproduct.AsNoTracking().FirstOrDefaultAsync(x => x.Id == productId && x.BrId == branchId);
                productName = p?.ProductName ?? "";
            }

            var nextDay = toDate.Date.AddDays(1);

            // Get kist schedules in the date range
            var kistQuery =
                from ks in _db.accountkistschedule.AsNoTracking()
                join a in _db.accountmaster.AsNoTracking() on ks.LoanAccId equals a.ID
                join kd in _db.accountkistdetail.AsNoTracking() on a.ID equals kd.AccountId into kdj
                from kd in kdj.DefaultIfEmpty()
                join lp in _db.loanproduct.AsNoTracking() on a.GeneralProductId equals lp.Id into lpj
                from lp in lpj.DefaultIfEmpty()
                where ks.BrId == branchId
                    && a.BranchId == branchId
                    && a.AccTypeId == (int)Enums.AccountTypes.Loan
                    && ks.Date >= fromDate.Date
                    && ks.Date < nextDay
                    && (productId == 0 || a.GeneralProductId == productId)
                orderby a.AccountNumber, ks.Date
                select new
                {
                    AccId        = a.ID,
                    a.AccountNumber,
                    AccountName  = a.AccountName ?? "",
                    ProductName  = lp != null ? lp.ProductName : "",
                    LoanDate     = kd != null ? kd.LoanDate : (DateTime?)null,
                    LoanAmount   = kd != null ? kd.LoanAmountPassed : null,
                    ks.KistNumber,
                    ks.Date,
                    KistAmount   = ks.KistAmount ?? 0m,
                    PrincipalAmt = ks.PrincipalAmt ?? 0m,
                    InterestAmt  = ks.InterestAmt ?? 0m,
                };

            var kistData = await kistQuery.ToListAsync();

            if (!kistData.Any())
                return (true, "No kist schedules found.", new LoanDemandDTO
                {
                    BranchName = branch?.branchmaster_name ?? "",
                    BranchAddress = branch?.branchmaster_addressline ?? "",
                    FromDate = fromDate, ToDate = toDate, ProductName = productName,
                });

            // Get cumulative Cr recoveries per loan account up to toDate
            var loanAccIds = kistData.Select(k => k.AccId).Distinct().ToList();
            var crRecoveries = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == branchId
                    && loanAccIds.Contains(v.AccountId)
                    && v.VoucherEntryType == "Cr"
                    && v.EntryStatus == "V"
                    && v.ValueDate < nextDay)
                .GroupBy(v => v.AccountId)
                .Select(g => new { AccId = g.Key, TotalCr = g.Sum(x => x.VoucherAmount) })
                .ToListAsync();

            var crMap = crRecoveries.ToDictionary(x => x.AccId, x => x.TotalCr);

            // Compute cumulative kist per account to determine paid/pending
            // Group kist schedules by account and sort by kist number
            var byAccount = kistData.GroupBy(k => k.AccId).ToDictionary(g => g.Key, g => g.OrderBy(x => x.KistNumber ?? 0).ToList());

            var rows = new List<LoanDemandRowDTO>();

            foreach (var kist in kistData)
            {
                crMap.TryGetValue(kist.AccId, out var totalCr);

                // Cumulative kist amount up to and including this kist number
                var accKists = byAccount[kist.AccId];
                decimal cumulative = accKists
                    .Where(k => (k.KistNumber ?? 0) <= (kist.KistNumber ?? 0))
                    .Sum(k => k.KistAmount);

                string status = totalCr >= cumulative ? "Paid" : "Pending";

                if (showPendingOnly && status == "Paid") continue;

                rows.Add(new LoanDemandRowDTO
                {
                    AccountNumber = kist.AccountNumber ?? "",
                    AccountName   = kist.AccountName,
                    ProductName   = kist.ProductName,
                    LoanDate      = kist.LoanDate,
                    LoanAmount    = kist.LoanAmount,
                    KistNumber    = kist.KistNumber ?? 0,
                    KistDate      = kist.Date,
                    KistAmount    = kist.KistAmount,
                    PrincipalAmt  = kist.PrincipalAmt,
                    InterestAmt   = kist.InterestAmt,
                    Status        = status,
                });
            }

            return (true, "OK", new LoanDemandDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate      = fromDate,
                ToDate        = toDate,
                ProductName   = productName,
                Rows          = rows,
                TotalKistAmount = rows.Sum(r => r.KistAmount),
                TotalPrincipal  = rows.Sum(r => r.PrincipalAmt),
                TotalInterest   = rows.Sum(r => r.InterestAmt),
                PaidCount       = rows.Count(r => r.Status == "Paid"),
                PendingCount    = rows.Count(r => r.Status == "Pending"),
            });
        }
    }
}
