using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class FDOpeningProductDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    public class FDOpeningRowDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccDetail { get; set; } = "";
        public string ProductName { get; set; } = "";
        public DateTime FDDate { get; set; }
        public decimal FDAmount { get; set; }
        public decimal MaturityAmount { get; set; }
        public decimal OpeningAmount { get; set; }
        public int PeriodMonths { get; set; }
        public string Remarks { get; set; } = "";
    }

    public class FDOpeningDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<FDOpeningRowDTO> Rows { get; set; } = new();
        public decimal TotalFDAmount { get; set; }
        public decimal TotalMaturityAmount { get; set; }
        public decimal TotalOpeningAmount { get; set; }
    }

    public class FDOpeningService
    {
        private readonly BankingDbContext _db;
        public FDOpeningService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<FDOpeningProductDTO>? data)> GetFDProductsAsync(int branchId)
        {
            var products = await _db.fdproduct.AsNoTracking()
                .Where(p => p.BranchId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new FDOpeningProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, FDOpeningDTO? data)> GetFDOpeningAsync(
            int branchId, DateTime fromDate, DateTime toDate, int productId)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "All Products";
            if (productId > 0)
            {
                var p = await _db.fdproduct.AsNoTracking().FirstOrDefaultAsync(x => x.Id == productId && x.BranchId == branchId);
                productName = p?.ProductName ?? "All Products";
            }

            var nextDay = toDate.Date.AddDays(1);

            var raw = await (
                from fd in _db.fdaccountdetail.AsNoTracking()
                join a in _db.accountmaster.AsNoTracking()
                    on new { AccountId = fd.AccountId, BranchId = fd.BranchId }
                    equals new { AccountId = a.ID, a.BranchId }
                join fp in _db.fdproduct.AsNoTracking() on a.GeneralProductId equals fp.Id into fpj
                from fp in fpj.DefaultIfEmpty()
                where fd.BranchId == branchId
                    && fd.FDDate >= fromDate.Date
                    && fd.FDDate < nextDay
                    && (productId == 0 || a.GeneralProductId == productId)
                orderby fd.FDDate, a.AccountNumber
                select new
                {
                    AccountId     = a.ID,
                    AccountNumber = a.AccountNumber ?? "",
                    AccPrefix     = a.AccPrefix ?? "",
                    AccSuffix     = a.AccSuffix,
                    AccountName   = a.AccountName ?? "",
                    ProductName   = fp != null ? fp.ProductName : "",
                    fd.FDDate,
                    fd.FDAmount,
                    fd.MaturityAmount,
                    PeriodMonths  = fd.FDPeriodMonths,
                    LTDNo         = fd.LTDNo,
                }
            ).ToListAsync();

            // Batch-fetch verified voucher entries on each FD's opening date to compute OpeningAmount
            var accountIds = raw.Select(r => r.AccountId).Distinct().ToList();
            var fdDates    = raw.Select(r => r.FDDate.Date).Distinct().ToList();

            var voucherEntries = accountIds.Count > 0
                ? await _db.vouchercreditdebitdetails.AsNoTracking()
                    .Where(v => accountIds.Contains(v.AccountId)
                             && v.VoucherStatus == "V"
                             && fdDates.Contains(v.ValueDate.Date))
                    .Select(v => new { v.AccountId, Date = v.ValueDate.Date, v.VoucherEntryType, v.VoucherAmount })
                    .ToListAsync()
                : [];

            // Build opening-amount lookup: (accountId, date) → net Cr-Dr (min 0)
            var openingMap = new Dictionary<(int, DateTime), decimal>();
            foreach (var item in voucherEntries)
            {
                var key = (item.AccountId, item.Date);
                if (!openingMap.ContainsKey(key)) openingMap[key] = 0m;
                openingMap[key] += item.VoucherEntryType == "Cr"
                    ? item.VoucherAmount
                    : -item.VoucherAmount;
            }

            var rows = raw.Select(r =>
            {
                var accNo  = !string.IsNullOrWhiteSpace(r.AccountNumber)
                                 ? r.AccountNumber
                                 : $"{r.AccPrefix}-{r.AccSuffix}";
                var detail = $"{r.AccountName}, A/C No. {accNo} Receipt No:-{r.LTDNo} Product {r.ProductName}";

                openingMap.TryGetValue((r.AccountId, r.FDDate.Date), out var net);
                var openingAmt = Math.Max(0, net);

                return new FDOpeningRowDTO
                {
                    AccountId     = r.AccountId,
                    AccountNumber = accNo,
                    AccountName   = r.AccountName,
                    AccDetail     = detail,
                    ProductName   = r.ProductName,
                    FDDate        = r.FDDate,
                    FDAmount      = r.FDAmount,
                    MaturityAmount= r.MaturityAmount,
                    OpeningAmount = openingAmt,
                    PeriodMonths  = r.PeriodMonths,
                    Remarks       = "",
                };
            }).ToList();

            return (true, "OK", new FDOpeningDTO
            {
                BranchName         = branch?.branchmaster_name ?? "",
                BranchAddress      = branch?.branchmaster_addressline ?? "",
                FromDate           = fromDate,
                ToDate             = toDate,
                ProductName        = productName,
                Rows               = rows,
                TotalFDAmount      = rows.Sum(r => r.FDAmount),
                TotalMaturityAmount= rows.Sum(r => r.MaturityAmount),
                TotalOpeningAmount = rows.Sum(r => r.OpeningAmount),
            });
        }
    }
}
