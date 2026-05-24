using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class RDKistReceiveProductDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    // ── Non-datewise ──────────────────────────────────────────────────────────

    public class RDKistSummaryRowDTO
    {
        public int SNo { get; set; }
        public string AccountName { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public decimal CreditAmount { get; set; }
        public int NoOfKist { get; set; }
    }

    // ── Datewise ──────────────────────────────────────────────────────────────

    public class RDKistDatewiseRowDTO
    {
        public int SNo { get; set; }
        public string AccountName { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public decimal CreditAmount { get; set; }
        public int VoucherNo { get; set; }
        public int NoOfKist { get; set; }
    }

    public class RDKistDateGroupDTO
    {
        public DateTime Date { get; set; }
        public List<RDKistDatewiseRowDTO> Rows { get; set; } = new();
        public decimal DateTotal { get; set; }
    }

    // ── Master response ───────────────────────────────────────────────────────

    public class RDKistReceiveDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public bool ShowDatewise { get; set; }
        public List<RDKistSummaryRowDTO> SummaryRows { get; set; } = new();
        public List<RDKistDateGroupDTO> DateGroups { get; set; } = new();
        public decimal GrandTotal { get; set; }
        public int TotalCount { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────

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
            int branchId, DateTime fromDate, DateTime toDate, int productId, bool showDatewise)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "All Products";
            if (productId > 0)
            {
                var p = await _db.rdproduct.AsNoTracking().FirstOrDefaultAsync(x => x.Id == productId && x.BrId == branchId);
                productName = p?.ProductName ?? "All Products";
            }

            var nextDay = toDate.Date.AddDays(1);

            var result = new RDKistReceiveDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate      = fromDate,
                ToDate        = toDate,
                ProductName   = productName,
                ShowDatewise  = showDatewise,
            };

            if (!showDatewise)
            {
                // ── Non-datewise: aggregate per account ───────────────────────
                var raw = await (
                    from rd in _db.voucherrddetail.AsNoTracking()
                    join a  in _db.accountmaster.AsNoTracking()   on rd.RdAccId equals a.ID
                    join det in _db.rdaccountdetail.AsNoTracking() on a.ID equals det.AccId into detj
                    from det in detj.DefaultIfEmpty()
                    where rd.BrId == branchId
                        && rd.VoucherMainStatus == "V"
                        && rd.Operation != "IP"
                        && rd.VoucherDate != null
                        && rd.VoucherDate >= fromDate.Date
                        && rd.VoucherDate < nextDay
                        && rd.AmountCr > 0
                        && a.AccTypeId == 5
                        && (productId == 0 || a.GeneralProductId == productId)
                    group new { rd, det } by new { a.ID, a.AccountName, a.AccountNumber } into g
                    select new
                    {
                        AccountId     = g.Key.ID,
                        AccountName   = g.Key.AccountName ?? "",
                        AccountNumber = g.Key.AccountNumber ?? "",
                        KistAmt       = g.Max(x => (decimal?)(x.det != null ? x.det.KistAmt : null)) ?? 0m,
                        CreditAmt     = (decimal)g.Sum(x => x.rd.AmountCr),
                    }
                ).ToListAsync();

                var summaryRows = raw
                    .Where(r => r.CreditAmt > 0)
                    .OrderBy(r => r.AccountNumber)
                    .Select((r, idx) => new RDKistSummaryRowDTO
                    {
                        SNo           = idx + 1,
                        AccountName   = r.AccountName,
                        AccountNumber = r.AccountNumber,
                        CreditAmount  = r.CreditAmt,
                        NoOfKist      = r.KistAmt > 0 ? (int)Math.Round(r.CreditAmt / r.KistAmt) : 0,
                    })
                    .ToList();

                result.SummaryRows = summaryRows;
                result.GrandTotal  = summaryRows.Sum(r => r.CreditAmount);
                result.TotalCount  = summaryRows.Count;
            }
            else
            {
                // ── Datewise: per date → per voucher per account ──────────────
                var raw = await (
                    from rd in _db.voucherrddetail.AsNoTracking()
                    join v  in _db.voucher.AsNoTracking()          on rd.VoucherId equals v.Id
                    join a  in _db.accountmaster.AsNoTracking()    on rd.RdAccId equals a.ID
                    join det in _db.rdaccountdetail.AsNoTracking() on a.ID equals det.AccId into detj
                    from det in detj.DefaultIfEmpty()
                    where rd.BrId == branchId
                        && rd.VoucherMainStatus == "V"
                        && rd.Operation != "IP"
                        && rd.VoucherDate != null
                        && rd.VoucherDate >= fromDate.Date
                        && rd.VoucherDate < nextDay
                        && rd.AmountCr > 0
                        && a.AccTypeId == 5
                        && (productId == 0 || a.GeneralProductId == productId)
                    group new { rd, v, det } by new { rd.VoucherDate, v.VoucherNo, a.ID, a.AccountName, a.AccountNumber } into g
                    select new
                    {
                        Date          = g.Key.VoucherDate!.Value,
                        VoucherNo     = g.Key.VoucherNo,
                        AccountId     = g.Key.ID,
                        AccountName   = g.Key.AccountName ?? "",
                        AccountNumber = g.Key.AccountNumber ?? "",
                        KistAmt       = g.Max(x => (decimal?)(x.det != null ? x.det.KistAmt : null)) ?? 0m,
                        CreditAmt     = (decimal)g.Sum(x => x.rd.AmountCr),
                    }
                ).ToListAsync();

                var dateGroups = raw
                    .Where(r => r.CreditAmt > 0)
                    .GroupBy(r => r.Date.Date)
                    .OrderBy(g => g.Key)
                    .Select(g =>
                    {
                        var rows = g.OrderBy(r => r.VoucherNo).ThenBy(r => r.AccountNumber)
                            .Select((r, idx) => new RDKistDatewiseRowDTO
                            {
                                SNo           = idx + 1,
                                AccountName   = r.AccountName,
                                AccountNumber = r.AccountNumber,
                                CreditAmount  = r.CreditAmt,
                                VoucherNo     = r.VoucherNo,
                                NoOfKist      = r.KistAmt > 0 ? (int)Math.Round(r.CreditAmt / r.KistAmt) : 0,
                            })
                            .ToList();
                        return new RDKistDateGroupDTO
                        {
                            Date      = g.Key,
                            Rows      = rows,
                            DateTotal = rows.Sum(r => r.CreditAmount),
                        };
                    })
                    .ToList();

                result.DateGroups  = dateGroups;
                result.GrandTotal  = dateGroups.Sum(g => g.DateTotal);
                result.TotalCount  = dateGroups.Sum(g => g.Rows.Count);
            }

            return (true, "OK", result);
        }
    }
}
