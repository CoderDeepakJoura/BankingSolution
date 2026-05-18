using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class LoanAdvancementProductDTO
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
    }

    public class LoanAdvancementRowDTO
    {
        public DateTime VoucherDate { get; set; }
        public int VoucherNo { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string RelationName { get; set; } = "";
        public string Particulars { get; set; } = "";
        public string ProductName { get; set; } = "";
        public decimal Amount { get; set; }
        public double? LoanAmountPassed { get; set; }
    }

    public class LoanAdvancementDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ProductName { get; set; } = "";
        public List<LoanAdvancementRowDTO> Rows { get; set; } = new();
        public decimal TotalAmount { get; set; }
    }

    public class LoanAdvancementService
    {
        private readonly BankingDbContext _db;
        public LoanAdvancementService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<LoanAdvancementProductDTO>? data)> GetLoanProductsAsync(int branchId)
        {
            var products = await _db.loanproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new LoanAdvancementProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, LoanAdvancementDTO? data)> GetLoanAdvancementAsync(
            int branchId, DateTime fromDate, DateTime toDate, int productId)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            string productName = "All Products";
            if (productId > 0)
            {
                var p = await _db.loanproduct.AsNoTracking().FirstOrDefaultAsync(x => x.Id == productId && x.BrId == branchId);
                productName = p?.ProductName ?? "All Products";
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
                join m in _db.member.AsNoTracking() on a.MemberId equals m.Id into mj
                from m in mj.DefaultIfEmpty()
                join rel in _db.relation.AsNoTracking() on m.RelationId equals rel.id into relj
                from rel in relj.DefaultIfEmpty()
                where v.BrID == branchId
                    && v.VoucherStatus == "V"
                    && d.ValueDate >= fromDate.Date
                    && d.ValueDate < nextDay
                    && d.BrId == branchId
                    && d.VoucherEntryType == "Dr"
                    && d.EntryStatus != "LInterest"
                    && a.AccTypeId == (int)Enums.AccountTypes.Loan
                    && a.BranchId == branchId
                    && (productId == 0 || a.GeneralProductId == productId)
                orderby d.ValueDate, v.VoucherNo
                select new LoanAdvancementRowDTO
                {
                    VoucherDate      = d.ValueDate,
                    VoucherNo        = v.VoucherNo,
                    AccountNumber    = a.AccountNumber ?? "",
                    AccountName      = a.AccountName ?? "",
                    RelativeName     = m != null ? m.RelativeName : "",
                    RelationName     = rel != null ? rel.description : "",
                    Particulars      = (d.Narration ?? "") + (v.VoucherNarration != null ? " " + v.VoucherNarration : ""),
                    ProductName      = lp != null ? lp.ProductName : "",
                    Amount           = d.VoucherAmount,
                    LoanAmountPassed = kd != null ? kd.LoanAmountPassed : null,
                }
            ).ToListAsync();

            return (true, "OK", new LoanAdvancementDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate      = fromDate,
                ToDate        = toDate,
                ProductName   = productName,
                Rows          = rows,
                TotalAmount   = rows.Sum(r => r.Amount),
            });
        }
    }
}
