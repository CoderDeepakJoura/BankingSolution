using BankingPlatform.API.Common;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class OdReserveRowDTO
    {
        public int SNo { get; set; }
        public int AccId { get; set; }
        public string AccountName { get; set; } = "";
        public string AcNo { get; set; } = "";
        public string ProductName { get; set; } = "";
        public int ProductId { get; set; }
        public double Debit { get; set; }
        public double Credit { get; set; }
        public double IntBal { get; set; }
    }

    public class OdReserveReportDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string QuarterLabel { get; set; } = "";
        public DateTime QuarterDate { get; set; }
        public double TotalDebit { get; set; }
        public double TotalCredit { get; set; }
        public double TotalOdReserve { get; set; }
        public List<OdReserveRowDTO> Rows { get; set; } = new();
    }

    public class GeneralAccountDTO
    {
        public int Id { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
    }

    public class OdReserveService
    {
        private readonly BankingDbContext _db;
        public OdReserveService(BankingDbContext db) => _db = db;

        public async Task<(bool, string, List<LoanAdvancementProductDTO>?)> GetLoanProductsAsync(int branchId)
        {
            var products = await _db.loanproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new LoanAdvancementProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool, string, List<GeneralAccountDTO>?)> GetGeneralAccountsAsync(int branchId)
        {
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId && a.AccTypeId == (int)Enums.AccountTypes.General && !a.IsAccClosed)
                .OrderBy(a => a.AccountNumber)
                .Select(a => new GeneralAccountDTO
                {
                    Id = a.ID,
                    AccountNumber = a.AccountNumber ?? "",
                    AccountName = a.AccountName ?? "",
                })
                .ToListAsync();
            return (true, "OK", accounts);
        }

        public async Task<(bool, string, OdReserveReportDTO?)> GetOdReserveReportAsync(
            int branchId, int productId, DateTime quarterDate)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            var (prevDate, quarterLabel) = GetQuarterBounds(quarterDate);

            var accounts = await (
                from a in _db.accountmaster.AsNoTracking()
                where a.BranchId == branchId
                    && a.AccTypeId == (int)Enums.AccountTypes.Loan
                    && (productId == 0 || a.GeneralProductId == productId)
                    && (!a.IsAccClosed || (a.IsAccClosed && a.ClosingDate > quarterDate))
                join lp in _db.loanproduct.AsNoTracking() on a.GeneralProductId equals lp.Id into lpj
                from lp in lpj.DefaultIfEmpty()
                select new
                {
                    a.ID,
                    a.AccountName,
                    a.AccountNumber,
                    ProductName = lp != null ? lp.ProductName : "",
                    ProductId = a.GeneralProductId ?? 0,
                }
            ).ToListAsync();

            if (accounts.Count == 0)
                return (true, "OK", new OdReserveReportDTO
                {
                    BranchName = branch?.branchmaster_name ?? "",
                    BranchAddress = branch?.branchmaster_addressline ?? "",
                    QuarterLabel = quarterLabel,
                    QuarterDate = quarterDate,
                    Rows = new()
                });

            var accountIds = accounts.Select(a => a.ID).ToList();

            var intCatOd = (int)Enums.IntCategory.OverdueRecoverable;

            var entries = await _db.voucherrecintdetail.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccId)
                    && v.IntCatId == intCatOd
                    && v.VoucherMainStatus == "V"
                    && v.ValueDate > prevDate
                    && v.ValueDate <= quarterDate)
                .GroupBy(v => v.AccId)
                .Select(g => new { AccId = g.Key, Debit = g.Sum(v => v.IntDr), Credit = g.Sum(v => v.IntCr) })
                .ToDictionaryAsync(x => x.AccId, x => x);

            var rows = new List<OdReserveRowDTO>();
            int sno = 1;
            foreach (var acc in accounts)
            {
                entries.TryGetValue(acc.ID, out var e);
                var debit = e?.Debit ?? 0;
                var credit = e?.Credit ?? 0;
                var intBal = debit - credit;
                if (debit == 0 && credit == 0) continue;
                rows.Add(new OdReserveRowDTO
                {
                    SNo = sno++,
                    AccId = acc.ID,
                    AccountName = acc.AccountName ?? "",
                    AcNo = acc.AccountNumber ?? "",
                    ProductName = acc.ProductName,
                    ProductId = acc.ProductId,
                    Debit = debit,
                    Credit = credit,
                    IntBal = intBal,
                });
            }

            var report = new OdReserveReportDTO
            {
                BranchName = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                QuarterLabel = quarterLabel,
                QuarterDate = quarterDate,
                TotalDebit = rows.Sum(r => r.Debit),
                TotalCredit = rows.Sum(r => r.Credit),
                TotalOdReserve = rows.Sum(r => r.IntBal),
                Rows = rows,
            };
            return (true, "OK", report);
        }

        public async Task<(bool, string)> SaveOdReserveAsync(
            int branchId, int productId, DateTime quarterDate, List<OdReserveRowDTO> rows)
        {
            // Remove existing entries for this branch + date + product
            var existing = await _db.vrodreserve
                .Where(v => v.BrId == branchId && v.Date == quarterDate
                    && (productId == 0 || v.ProductId == productId))
                .ToListAsync();
            _db.vrodreserve.RemoveRange(existing);

            var entries = rows.Select(r => new VrOdReserve
            {
                BrId = branchId,
                Date = quarterDate,
                AccId = r.AccId,
                Debit = (decimal)r.Debit,
                Credit = (decimal)r.Credit,
                ProductId = r.ProductId,
            }).ToList();

            await _db.vrodreserve.AddRangeAsync(entries);
            await _db.SaveChangesAsync();
            return (true, "Saved successfully.");
        }

        private static (DateTime prevDate, string label) GetQuarterBounds(DateTime qDate)
        {
            var m = qDate.Month;
            // Quarter start months: Jan=1, Apr=4, Jul=7, Oct=10
            var startMonth = ((m - 1) / 3) * 3 + 1;
            var quarterStart = new DateTime(qDate.Year, startMonth, 1);
            var prevDate = quarterStart.AddDays(-1);

            var label = startMonth switch
            {
                1  => $"Q4 (Jan–Mar {qDate.Year})",
                4  => $"Q1 (Apr–Jun {qDate.Year})",
                7  => $"Q2 (Jul–Sep {qDate.Year})",
                10 => $"Q3 (Oct–Dec {qDate.Year})",
                _  => qDate.ToString("MMM yyyy"),
            };
            return (prevDate, label);
        }
    }
}
