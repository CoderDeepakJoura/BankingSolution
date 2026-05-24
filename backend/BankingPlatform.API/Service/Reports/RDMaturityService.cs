using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class RDMaturityProductDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    public class RDMaturityRowDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public int RDNumber { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime MaturityDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public decimal RDAmount { get; set; }
        public decimal MaturityAmount { get; set; }
    }

    public class RDMaturityDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<RDMaturityRowDTO> Rows { get; set; } = new();
        public decimal TotalRDAmount { get; set; }
        public decimal TotalMaturityAmount { get; set; }
    }

    public class RDMaturityService
    {
        private readonly BankingDbContext _db;
        public RDMaturityService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<RDMaturityProductDTO>? data)> GetRDProductsAsync(int branchId)
        {
            var products = await _db.rdproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new RDMaturityProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, RDMaturityDTO? data)> GetRDMaturityAsync(
            int branchId, DateTime fromDate, DateTime toDate, int productId)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "All Products";
            if (productId > 0)
            {
                var p = await _db.rdproduct.AsNoTracking().FirstOrDefaultAsync(x => x.Id == productId && x.BrId == branchId);
                productName = p?.ProductName ?? "All Products";
            }

            var nextDay = toDate.Date.AddDays(1);

            var raw = await (
                from rd in _db.rdaccountdetail.AsNoTracking()
                join a in _db.accountmaster.AsNoTracking()
                    on new { AccountId = rd.AccId!.Value, BranchId = rd.BrId }
                    equals new { AccountId = a.ID, a.BranchId }
                join rp in _db.rdproduct.AsNoTracking() on a.GeneralProductId equals rp.Id into rpj
                from rp in rpj.DefaultIfEmpty()
                where rd.BrId == branchId
                    && rd.Status == 1
                    && rd.MaturityDate >= fromDate.Date
                    && rd.MaturityDate < nextDay
                    && (productId == 0 || a.GeneralProductId == productId)
                orderby rd.MaturityDate, a.AccountNumber
                select new
                {
                    AccountId    = a.ID,
                    AccountNumber= a.AccountNumber ?? "",
                    AccPrefix    = a.AccPrefix ?? "",
                    AccSuffix    = a.AccSuffix,
                    AccountName  = a.AccountName ?? "",
                    ProductName  = rp != null ? rp.ProductName : "",
                    RDNumber     = rd.RdNumber ?? 0,
                    OpeningDate  = rd.RdDate,
                    MaturityDate = rd.MaturityDate!.Value,
                    PaymentDate  = rd.MaturedOn,
                    RDAmount     = rd.RdAmount,
                    MaturityAmt  = rd.MaturityAmt ?? 0m,
                }
            ).ToListAsync();

            var rows = raw.Select(r => new RDMaturityRowDTO
            {
                AccountId    = r.AccountId,
                AccountNumber= !string.IsNullOrWhiteSpace(r.AccountNumber)
                                   ? r.AccountNumber
                                   : $"{r.AccPrefix}-{r.AccSuffix}",
                AccountName  = r.AccountName,
                ProductName  = r.ProductName,
                RDNumber     = r.RDNumber,
                OpeningDate  = r.OpeningDate,
                MaturityDate = r.MaturityDate,
                PaymentDate  = r.PaymentDate,
                RDAmount     = r.RDAmount,
                MaturityAmount = r.MaturityAmt,
            }).ToList();

            return (true, "OK", new RDMaturityDTO
            {
                BranchName         = branch?.branchmaster_name ?? "",
                BranchAddress      = branch?.branchmaster_addressline ?? "",
                FromDate           = fromDate,
                ToDate             = toDate,
                ProductName        = productName,
                Rows               = rows,
                TotalRDAmount      = rows.Sum(r => r.RDAmount),
                TotalMaturityAmount= rows.Sum(r => r.MaturityAmount),
            });
        }
    }
}
