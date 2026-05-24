using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class FDMaturityProductDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    public class FDMaturityRowDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public DateTime FDDate { get; set; }
        public DateTime MaturityDate { get; set; }
        public decimal FDAmount { get; set; }
        public decimal MaturityAmount { get; set; }
        public int PeriodMonths { get; set; }
        public int PeriodDays { get; set; }
        public decimal IntRate { get; set; }
        public string Status { get; set; } = "";
    }

    public class FDMaturityDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<FDMaturityRowDTO> Rows { get; set; } = new();
        public decimal TotalFDAmount { get; set; }
        public decimal TotalMaturityAmount { get; set; }
        public decimal TotalInterestAmount { get; set; }
    }

    public class FDMaturityService
    {
        private readonly BankingDbContext _db;
        public FDMaturityService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<FDMaturityProductDTO>? data)> GetFDProductsAsync(int branchId)
        {
            var products = await _db.fdproduct.AsNoTracking()
                .Where(p => p.BranchId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new FDMaturityProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, FDMaturityDTO? data)> GetFDMaturityAsync(
            int branchId, DateTime fromDate, DateTime toDate, int productId)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "";
            if (productId > 0)
            {
                var p = await _db.fdproduct.AsNoTracking().FirstOrDefaultAsync(x => x.Id == productId && x.BranchId == branchId);
                productName = p?.ProductName ?? "";
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
                    && fd.FDStatus == 1
                    && fd.FDMaturityDate >= fromDate.Date
                    && fd.FDMaturityDate < nextDay
                    && (productId == 0 || a.GeneralProductId == productId)
                orderby fd.FDMaturityDate, a.AccountNumber
                select new
                {
                    AccountId     = a.ID,
                    AccountNumber = a.AccountNumber ?? "",
                    AccPrefix     = a.AccPrefix ?? "",
                    AccSuffix     = a.AccSuffix,
                    AccountName   = a.AccountName ?? "",
                    ProductName   = fp != null ? fp.ProductName : "",
                    fd.FDDate,
                    MaturityDate  = fd.FDMaturityDate,
                    fd.FDAmount,
                    fd.MaturityAmount,
                    PeriodMonths  = fd.FDPeriodMonths,
                    PeriodDays    = fd.FDPeriodDays,
                    fd.IntRate,
                    fd.FDStatus,
                }
            ).ToListAsync();

            var rows = raw.Select(fd => new FDMaturityRowDTO
            {
                AccountId     = fd.AccountId,
                AccountNumber = !string.IsNullOrWhiteSpace(fd.AccountNumber)
                                    ? fd.AccountNumber
                                    : $"{fd.AccPrefix}-{fd.AccSuffix}",
                AccountName   = fd.AccountName,
                ProductName   = fd.ProductName,
                FDDate        = fd.FDDate,
                MaturityDate  = fd.MaturityDate,
                FDAmount      = fd.FDAmount,
                MaturityAmount= fd.MaturityAmount,
                PeriodMonths  = fd.PeriodMonths,
                PeriodDays    = fd.PeriodDays,
                IntRate       = fd.IntRate,
                Status        = fd.FDStatus switch { 1 => "Open", 2 => "Matured", 3 => "Pre-Matured", 4 => "Renewed", _ => "Unknown" },
            }).ToList();

            return (true, "OK", new FDMaturityDTO
            {
                BranchName          = branch?.branchmaster_name ?? "",
                BranchAddress       = branch?.branchmaster_addressline ?? "",
                FromDate            = fromDate,
                ToDate              = toDate,
                ProductName         = productName,
                Rows                = rows,
                TotalFDAmount       = rows.Sum(r => r.FDAmount),
                TotalMaturityAmount = rows.Sum(r => r.MaturityAmount),
                TotalInterestAmount = rows.Sum(r => r.MaturityAmount - r.FDAmount),
            });
        }
    }
}
