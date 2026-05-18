using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class LoanRecoveryRowDTO
    {
        public DateTime VoucherDate { get; set; }
        public int VoucherNo { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string ProductName { get; set; } = "";
        public decimal RecoveryAmount { get; set; }
        public DateTime? LoanDate { get; set; }
        public double? LoanAmountPassed { get; set; }
    }

    public class LoanRecoveryDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<LoanRecoveryRowDTO> Rows { get; set; } = new();
        public decimal TotalRecovery { get; set; }
    }

    public class LoanRecoveryService
    {
        private readonly BankingDbContext _db;
        public LoanRecoveryService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<LoanAdvancementProductDTO>? data)> GetLoanProductsAsync(int branchId)
        {
            var products = await _db.loanproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new LoanAdvancementProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, LoanRecoveryDTO? data)> GetLoanRecoveryAsync(
            int branchId, DateTime fromDate, DateTime toDate, int productId)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "";
            if (productId > 0)
            {
                var p = await _db.loanproduct.AsNoTracking().FirstOrDefaultAsync(x => x.Id == productId && x.BrId == branchId);
                productName = p?.ProductName ?? "";
            }

            var nextDay = toDate.Date.AddDays(1);

            var rows = await (
                from v in _db.voucher.AsNoTracking()
                join d in _db.vouchercreditdebitdetails.AsNoTracking() on v.Id equals d.VoucherID
                join a in _db.accountmaster.AsNoTracking() on d.AccountId equals a.ID
                join kd in _db.accountkistdetail.AsNoTracking() on a.ID equals kd.AccountId into kdj
                from kd in kdj.DefaultIfEmpty()
                join lp in _db.loanproduct.AsNoTracking() on a.GeneralProductId equals lp.Id into lpj
                from lp in lpj.DefaultIfEmpty()
                where v.BrID == branchId
                    && v.VoucherSubType == (int)Enums.VoucherSubType.LoanRecovery
                    && v.VoucherStatus == "V"
                    && v.VoucherDate >= fromDate.Date
                    && v.VoucherDate < nextDay
                    && d.BrId == branchId
                    && d.EntryStatus == "V"
                    && d.VoucherEntryType == "Cr"
                    && a.AccTypeId == (int)Enums.AccountTypes.Loan
                    && (productId == 0 || a.GeneralProductId == productId)
                orderby v.VoucherDate, v.VoucherNo
                select new LoanRecoveryRowDTO
                {
                    VoucherDate      = v.VoucherDate,
                    VoucherNo        = v.VoucherNo,
                    AccountNumber    = a.AccountNumber ?? "",
                    AccountName      = a.AccountName ?? "",
                    ProductName      = lp != null ? lp.ProductName : "",
                    RecoveryAmount   = d.VoucherAmount,
                    LoanDate         = kd != null ? kd.LoanDate : (DateTime?)null,
                    LoanAmountPassed = kd != null ? kd.LoanAmountPassed : null,
                }
            ).ToListAsync();

            return (true, "OK", new LoanRecoveryDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate      = fromDate,
                ToDate        = toDate,
                ProductName   = productName,
                Rows          = rows,
                TotalRecovery = rows.Sum(r => r.RecoveryAmount),
            });
        }
    }
}
