using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class RDProductItem
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
        public string ProductCode { get; set; } = "";
    }

    public class RDAccountItem
    {
        public int Id { get; set; }
        public string AccountIdentifier { get; set; } = "";
        public string AccountName { get; set; } = "";
    }

    public class RDLedgerEntryDTO
    {
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public string Particulars { get; set; } = "";
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal Balance { get; set; }
        public string? Narration { get; set; }
    }

    public class RDLedgerDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccountIdentifier { get; set; } = "";
        public string ProductName { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public DateTime SessionFromDate { get; set; }
        public DateTime SessionToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public List<RDLedgerEntryDTO> Entries { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class RDLedgerService
    {
        private readonly BankingDbContext _context;

        public RDLedgerService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<(bool success, string message, List<RDProductItem>? data)> GetRDProductsAsync(int branchId)
        {
            var products = await _context.rdproduct.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.ProductName)
                .Select(x => new RDProductItem
                {
                    Id = x.Id,
                    ProductName = x.ProductName,
                    ProductCode = x.ProductCode
                })
                .ToListAsync();

            return (true, "OK", products);
        }

        public async Task<(bool success, string message, List<RDAccountItem>? data)> GetRDAccountsAsync(int branchId, int productId)
        {
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                    && x.AccTypeId == (int)Enums.AccountTypes.RD
                    && x.GeneralProductId == productId
                    && !x.IsAccClosed)
                .OrderBy(x => x.AccSuffix)
                .Select(x => new RDAccountItem
                {
                    Id = x.ID,
                    AccountIdentifier = (x.AccPrefix ?? "") + "-" + (x.AccSuffix ?? 0),
                    AccountName = x.AccountName ?? ""
                })
                .ToListAsync();

            return (true, "OK", accounts);
        }

        public async Task<(bool success, string message, RDLedgerDTO? data)> GetRDLedgerAsync(
            int branchId, int accountId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _context.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == branchId);
            if (branch == null)
                return (false, "Branch not found.", null);

            var account = await _context.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == accountId);
            if (account == null)
                return (false, "Account not found.", null);

            var product = account.GeneralProductId.HasValue
                ? await _context.rdproduct.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == account.GeneralProductId.Value)
                : null;

            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            string accountIdentifier = $"{account.AccPrefix}-{account.AccSuffix}";

            decimal openingBalance = await CalculateOpeningBalanceAsync(branchId, accountId, fromDate.Date);

            DateTime toExclusive = toDate.Date.AddDays(1);

            var emptyResult = new RDLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                AccountName = account.AccountName ?? "",
                AccountIdentifier = accountIdentifier,
                ProductName = product?.ProductName ?? "",
                FromDate = fromDate,
                ToDate = toDate,
                SessionFromDate = session?.fromdate ?? fromDate,
                SessionToDate = session?.todate ?? toDate,
                OpeningBalance = openingBalance,
                ClosingBalance = openingBalance
            };

            var voucherData = await _context.voucher.AsNoTracking()
                .Where(x => x.BrID == branchId
                    && x.VoucherDate >= fromDate.Date
                    && x.VoucherDate < toExclusive)
                .Select(x => new { x.Id, x.VoucherNo, x.VoucherDate })
                .ToListAsync();

            if (!voucherData.Any())
                return (true, "No transactions found.", emptyResult);

            var voucherIdList = voucherData.Select(v => v.Id).ToList();
            var voucherInfoMap = voucherData.ToDictionary(
                v => v.Id,
                v => new RDVoucherInfo(v.VoucherNo, v.VoucherDate.Date));

            var accountEntries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => voucherIdList.Contains(x.VoucherID) && x.AccountId == accountId)
                .ToListAsync();

            if (!accountEntries.Any())
                return (true, "No entries found for this account.", emptyResult);

            var relevantVoucherIds = accountEntries.Select(e => e.VoucherID).Distinct().ToList();
            var contraEntries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => relevantVoucherIds.Contains(x.VoucherID) && x.AccountId != accountId)
                .ToListAsync();

            var contraAccountIds = contraEntries.Select(e => e.AccountId).Distinct().ToList();
            var accountNameMap = await _context.accountmaster.AsNoTracking()
                .Where(x => contraAccountIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => x.AccountName ?? "");

            var contraByVoucher = contraEntries
                .GroupBy(e => e.VoucherID)
                .ToDictionary(g => g.Key, g => g.ToList());

            decimal runningBalance = openingBalance;
            var entries = new List<RDLedgerEntryDTO>();

            var sorted = accountEntries
                .OrderBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherDate ?? DateTime.MinValue)
                .ThenBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherNo ?? 0)
                .ToList();

            foreach (var entry in sorted)
            {
                var info = voucherInfoMap.GetValueOrDefault(entry.VoucherID);
                if (info == null) continue;

                // Cr RD = kist/deposit (balance ↑); Dr RD = withdrawal/premature (balance ↓)
                string contraType = entry.VoucherEntryType == "Cr" ? "Dr" : "Cr";
                var contras = contraByVoucher.GetValueOrDefault(entry.VoucherID, new())
                    .Where(e => e.VoucherEntryType == contraType)
                    .Select(e => accountNameMap.GetValueOrDefault(e.AccountId, ""))
                    .Where(n => !string.IsNullOrEmpty(n))
                    .Distinct()
                    .ToList();

                string particulars = contras.Any() ? string.Join(" / ", contras) : "—";

                decimal? dr = entry.VoucherEntryType == "Dr" ? entry.VoucherAmount : (decimal?)null;
                decimal? cr = entry.VoucherEntryType == "Cr" ? entry.VoucherAmount : (decimal?)null;

                if (cr.HasValue) runningBalance += cr.Value;
                else if (dr.HasValue) runningBalance -= dr.Value;

                entries.Add(new RDLedgerEntryDTO
                {
                    VoucherNo = info.VoucherNo,
                    VoucherDate = info.VoucherDate,
                    Particulars = particulars,
                    Dr = dr,
                    Cr = cr,
                    Balance = runningBalance,
                    Narration = entry.Narration
                });
            }

            decimal totalDr = entries.Sum(e => e.Dr ?? 0);
            decimal totalCr = entries.Sum(e => e.Cr ?? 0);

            return (true, "Success", new RDLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                AccountName = account.AccountName ?? "",
                AccountIdentifier = accountIdentifier,
                ProductName = product?.ProductName ?? "",
                FromDate = fromDate,
                ToDate = toDate,
                SessionFromDate = session?.fromdate ?? fromDate,
                SessionToDate = session?.todate ?? toDate,
                OpeningBalance = openingBalance,
                Entries = entries,
                TotalDr = totalDr,
                TotalCr = totalCr,
                ClosingBalance = runningBalance
            });
        }

        private record RDVoucherInfo(int VoucherNo, DateTime VoucherDate);

        private async Task<decimal> CalculateOpeningBalanceAsync(int branchId, int accountId, DateTime fromDate)
        {
            var ob = await _context.accopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccountId == accountId);

            decimal initial = ob == null ? 0
                : (ob.EntryType?.ToUpper() == "CR" ? ob.OpeningAmount : -ob.OpeningAmount);

            var crSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == accountId
                    && x.e.VoucherEntryType == "Cr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate)
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            var drSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == accountId
                    && x.e.VoucherEntryType == "Dr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate)
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            return initial + crSum - drSum;
        }
    }
}
