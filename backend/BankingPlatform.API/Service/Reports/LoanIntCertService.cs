using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class LoanIntCertAccountDTO
    {
        public int Id { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
    }

    public class LoanIntCertDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string ProductName { get; set; } = "";
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string MemberName { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string RelationName { get; set; } = "";
        public string AddressLine1 { get; set; } = "";
        public string AddressLine2 { get; set; } = "";
        public string VillageName { get; set; } = "";
        public string Pincode { get; set; } = "";
        public double LimitSanctioned { get; set; }
        public double InterestRate { get; set; }
        public decimal InterestDebited { get; set; }
        public decimal PrincipalRepaid { get; set; }
        public decimal InterestRepaid { get; set; }
        public decimal ChargesRepaid { get; set; }
        public decimal TotalRepaid { get; set; }
        public DateTime? LoanDate { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
    }

    public class LoanIntCertService
    {
        private readonly BankingDbContext _db;
        public LoanIntCertService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<LoanAdvancementProductDTO>? data)> GetLoanProductsAsync(int branchId)
        {
            var products = await _db.loanproduct.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.ProductName)
                .Select(p => new LoanAdvancementProductDTO { Id = p.Id, ProductName = p.ProductName })
                .ToListAsync();
            return (true, "OK", products);
        }

        public async Task<(bool success, string message, List<LoanIntCertAccountDTO>? data)> GetLoanAccountsAsync(int branchId, int productId)
        {
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId
                    && a.AccTypeId == (int)Enums.AccountTypes.Loan
                    && (productId == 0 || a.GeneralProductId == productId))
                .OrderBy(a => a.AccountNumber)
                .Select(a => new LoanIntCertAccountDTO
                {
                    Id = a.ID,
                    AccountNumber = a.AccountNumber ?? "",
                    AccountName = a.AccountName ?? "",
                })
                .ToListAsync();
            return (true, "OK", accounts);
        }

        public async Task<(bool success, string message, LoanIntCertDTO? data)> GetLoanIntCertAsync(
            int branchId, int accountId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            // Account + member + address
            var accInfo = await (
                from a in _db.accountmaster.AsNoTracking()
                join kd in _db.accountkistdetail.AsNoTracking() on a.ID equals kd.AccountId into kdj
                from kd in kdj.DefaultIfEmpty()
                join lp in _db.loanproduct.AsNoTracking() on a.GeneralProductId equals lp.Id into lpj
                from lp in lpj.DefaultIfEmpty()
                join m in _db.member.AsNoTracking() on a.MemberId equals m.Id into mj
                from m in mj.DefaultIfEmpty()
                join rel in _db.relation.AsNoTracking() on m.RelationId equals rel.id into relj
                from rel in relj.DefaultIfEmpty()
                join loc in _db.memberlocationdetails.AsNoTracking()
                    on new { MemberId = m != null ? m.Id : 0, BranchId = branchId }
                    equals new { loc.MemberId, loc.BranchId } into locj
                from loc in locj.DefaultIfEmpty()
                join v in _db.village.AsNoTracking() on (loc != null ? loc.VillageId1 : 0) equals v.id into vj
                from v in vj.DefaultIfEmpty()
                where a.ID == accountId && a.BranchId == branchId
                select new
                {
                    AccountNumber   = a.AccountNumber ?? "",
                    AccountName     = a.AccountName ?? "",
                    ProductName     = lp != null ? lp.ProductName : "",
                    LimitSanctioned = kd != null ? (kd.LoanAmountPassed ?? 0) : 0,
                    InterestRate    = kd != null ? (kd.StandardInterestRate ?? 0) : 0,
                    LoanDate        = kd != null ? (DateTime?)kd.LoanDate : null,
                    MemberName      = m != null ? m.MemberName : "",
                    RelativeName    = m != null ? m.RelativeName : "",
                    RelationName    = rel != null ? rel.description : "",
                    AddressLine1    = loc != null ? (loc.AddressLine1 ?? "") : "",
                    AddressLine2    = loc != null ? (loc.AddressLine2 ?? "") : "",
                    VillageName     = v != null ? v.villagename : "",
                    Pincode         = v != null ? v.pincode.ToString() : "",
                }
            ).FirstOrDefaultAsync();

            if (accInfo == null)
                return (false, "Account not found.", null);

            var nextDay = toDate.Date.AddDays(1);

            // Interest debited during period (Dr entries with EntryStatus = LInterest)
            var interestDebited = await (
                from d in _db.vouchercreditdebitdetails.AsNoTracking()
                join vch in _db.voucher.AsNoTracking() on d.VoucherID equals vch.Id
                where d.AccountId == accountId
                    && d.BrId == branchId
                    && d.VoucherEntryType == "Dr"
                    && d.EntryStatus == "LInterest"
                    && vch.VoucherStatus == "V"
                    && d.ValueDate >= fromDate.Date
                    && d.ValueDate < nextDay
                select d.VoucherAmount
            ).SumAsync();

            // Principal repaid (Cr entries, EntryStatus != LInterest)
            var principalRepaid = await (
                from d in _db.vouchercreditdebitdetails.AsNoTracking()
                join vch in _db.voucher.AsNoTracking() on d.VoucherID equals vch.Id
                where d.AccountId == accountId
                    && d.BrId == branchId
                    && d.VoucherEntryType == "Cr"
                    && d.EntryStatus != "LInterest"
                    && vch.VoucherStatus == "V"
                    && d.ValueDate >= fromDate.Date
                    && d.ValueDate < nextDay
                select d.VoucherAmount
            ).SumAsync();

            // Interest repaid (Cr entries with EntryStatus = LInterest)
            var interestRepaid = await (
                from d in _db.vouchercreditdebitdetails.AsNoTracking()
                join vch in _db.voucher.AsNoTracking() on d.VoucherID equals vch.Id
                where d.AccountId == accountId
                    && d.BrId == branchId
                    && d.VoucherEntryType == "Cr"
                    && d.EntryStatus == "LInterest"
                    && vch.VoucherStatus == "V"
                    && d.ValueDate >= fromDate.Date
                    && d.ValueDate < nextDay
                select d.VoucherAmount
            ).SumAsync();

            return (true, "OK", new LoanIntCertDTO
            {
                BranchName      = branch?.branchmaster_name ?? "",
                BranchAddress   = branch?.branchmaster_addressline ?? "",
                ProductName     = accInfo.ProductName,
                AccountNo       = accInfo.AccountNumber,
                AccountName     = accInfo.AccountName,
                MemberName      = accInfo.MemberName,
                RelativeName    = accInfo.RelativeName,
                RelationName    = accInfo.RelationName,
                AddressLine1    = accInfo.AddressLine1,
                AddressLine2    = accInfo.AddressLine2,
                VillageName     = accInfo.VillageName,
                Pincode         = accInfo.Pincode,
                LimitSanctioned = accInfo.LimitSanctioned,
                InterestRate    = accInfo.InterestRate,
                LoanDate        = accInfo.LoanDate,
                InterestDebited = interestDebited,
                PrincipalRepaid = principalRepaid,
                InterestRepaid  = interestRepaid,
                ChargesRepaid   = 0m,
                TotalRepaid     = principalRepaid + interestRepaid,
                FromDate        = fromDate,
                ToDate          = toDate,
            });
        }
    }
}
