using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class RDKistReceiveProductDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    public class RDKistReceiveRowDTO
    {
        public DateTime VoucherDate { get; set; }
        public int VoucherNo { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public decimal KistAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class RDKistReceiveDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<RDKistReceiveRowDTO> Rows { get; set; } = new();
        public decimal TotalKistAmount { get; set; }
        public decimal TotalPenaltyAmount { get; set; }
        public decimal GrandTotal { get; set; }
        public int TotalCount { get; set; }
    }

    public class RDKistReceiveService
    {
        private readonly BankingDbContext _db;
        public RDKistReceiveService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<RDKistReceiveProductDTO>? data)> GetRDProductsAsync(int branchId)
        {
            var products = await _db.rdproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new RDKistReceiveProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, RDKistReceiveDTO? data)> GetRDKistReceiveAsync(
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

            var query =
                from rd in _db.voucherrddetail.AsNoTracking()
                join v in _db.voucher.AsNoTracking() on rd.VoucherId equals v.Id
                join a in _db.accountmaster.AsNoTracking() on rd.RdAccId equals a.ID
                join rp in _db.rdproduct.AsNoTracking() on a.GeneralProductId equals rp.Id into rpj
                from rp in rpj.DefaultIfEmpty()
                where rd.BrId == branchId
                    && rd.VoucherMainStatus == "V"
                    && rd.VoucherDate != null
                    && rd.VoucherDate >= fromDate.Date
                    && rd.VoucherDate < nextDay
                    && rd.AmountCr > 0
                select new
                {
                    rd.VoucherDate,
                    v.VoucherNo,
                    AccountNumber = a.AccountNumber ?? "",
                    AccountName   = a.AccountName ?? "",
                    ProductName   = rp != null ? rp.ProductName : "",
                    KistAmount    = (decimal)rd.AmountCr,
                    PenaltyAmount = rd.PenalAmt ?? 0m,
                };

            if (productId > 0)
                query = query.Where(r => r.ProductName == productName);

            var raw = await query.OrderBy(r => r.VoucherDate).ThenBy(r => r.VoucherNo).ToListAsync();

            var rows = raw.Select(r => new RDKistReceiveRowDTO
            {
                VoucherDate   = r.VoucherDate!.Value,
                VoucherNo     = r.VoucherNo,
                AccountNumber = r.AccountNumber,
                AccountName   = r.AccountName,
                ProductName   = r.ProductName,
                KistAmount    = r.KistAmount,
                PenaltyAmount = r.PenaltyAmount,
                TotalAmount   = r.KistAmount + r.PenaltyAmount,
            }).ToList();

            return (true, "OK", new RDKistReceiveDTO
            {
                BranchName         = branch?.branchmaster_name ?? "",
                BranchAddress      = branch?.branchmaster_addressline ?? "",
                FromDate           = fromDate,
                ToDate             = toDate,
                ProductName        = productName,
                Rows               = rows,
                TotalKistAmount    = rows.Sum(r => r.KistAmount),
                TotalPenaltyAmount = rows.Sum(r => r.PenaltyAmount),
                GrandTotal         = rows.Sum(r => r.TotalAmount),
                TotalCount         = rows.Count,
            });
        }
    }
}
