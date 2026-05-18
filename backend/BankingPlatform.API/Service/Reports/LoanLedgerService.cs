using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class LoanProductItem
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
        public string ProductCode { get; set; } = "";
    }

    public class LoanAccountItem
    {
        public int Id { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
    }

    public class LoanLedgerEntryDTO
    {
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public string Particulars { get; set; } = "";
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal Balance { get; set; }
        public string? Narration { get; set; }
    }

    public class LoanLedgerDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public string ProductName { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public DateTime SessionFromDate { get; set; }
        public DateTime SessionToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public List<LoanLedgerEntryDTO> Entries { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class LoanLedgerService
    {
        private readonly BankingDbContext _context;

        public LoanLedgerService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<(bool success, string message, List<LoanProductItem>? data)> GetLoanProductsAsync(int branchId)
        {
            var products = await _context.loanproduct.AsNoTracking()
                .Where(x => x.BrId == branchId)
                .OrderBy(x => x.ProductName)
                .Select(x => new LoanProductItem
                {
                    Id = x.Id,
                    ProductName = x.ProductName,
                    ProductCode = x.Code
                })
                .ToListAsync();

            return (true, "OK", products);
        }

        public async Task<(bool success, string message, List<LoanAccountItem>? data)> GetLoanAccountsAsync(int branchId, int productId)
        {
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                    && x.AccTypeId == (int)Enums.AccountTypes.Loan
                    && x.GeneralProductId == productId
                    && !x.IsAccClosed)
                .OrderBy(x => x.AccountNumber)
                .Select(x => new LoanAccountItem
                {
                    Id = x.ID,
                    AccountNumber = x.AccountNumber ?? "",
                    AccountName = x.AccountName ?? ""
                })
                .ToListAsync();

            return (true, "OK", accounts);
        }

        public async Task<(bool success, string message, LoanLedgerDTO? data)> GetLoanLedgerAsync(
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
                ? await _context.loanproduct.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == account.GeneralProductId.Value)
                : null;

            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            decimal openingBalance = await CalculateOpeningBalanceAsync(branchId, accountId, fromDate.Date);

            DateTime toExclusive = toDate.Date.AddDays(1);

            var emptyResult = new LoanLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                AccountName = account.AccountName ?? "",
                AccountNumber = account.AccountNumber ?? "",
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
                v => new LLVoucherInfo(v.VoucherNo, v.VoucherDate.Date));

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
            var entries = new List<LoanLedgerEntryDTO>();

            var sorted = accountEntries
                .OrderBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherDate ?? DateTime.MinValue)
                .ThenBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherNo ?? 0)
                .ToList();

            foreach (var entry in sorted)
            {
                var info = voucherInfoMap.GetValueOrDefault(entry.VoucherID);
                if (info == null) continue;

                // Loan: Dr = advancement/interest (contra is Cr side); Cr = recovery (contra is Dr side)
                string contraType = entry.VoucherEntryType == "Dr" ? "Cr" : "Dr";
                var contras = contraByVoucher.GetValueOrDefault(entry.VoucherID, new())
                    .Where(e => e.VoucherEntryType == contraType)
                    .Select(e => accountNameMap.GetValueOrDefault(e.AccountId, ""))
                    .Where(n => !string.IsNullOrEmpty(n))
                    .Distinct()
                    .ToList();

                string particulars = contras.Any() ? string.Join(" / ", contras) : "—";

                decimal? dr = entry.VoucherEntryType == "Dr" ? entry.VoucherAmount : (decimal?)null;
                decimal? cr = entry.VoucherEntryType == "Cr" ? entry.VoucherAmount : (decimal?)null;

                // Loan: Dr increases outstanding, Cr (recovery) decreases outstanding
                if (dr.HasValue) runningBalance += dr.Value;
                else if (cr.HasValue) runningBalance -= cr.Value;

                entries.Add(new LoanLedgerEntryDTO
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

            return (true, "Success", new LoanLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                AccountName = account.AccountName ?? "",
                AccountNumber = account.AccountNumber ?? "",
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

        private record LLVoucherInfo(int VoucherNo, DateTime VoucherDate);

        private async Task<decimal> CalculateOpeningBalanceAsync(int branchId, int accountId, DateTime fromDate)
        {
            var ob = await _context.loanaccopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccId == accountId);

            // Loan: Dr OB = positive (outstanding), Cr OB = negative (overpayment)
            decimal initial = ob == null ? 0
                : (ob.BalType?.ToUpper() == "DR" ? (ob.TotalBalance ?? 0) : -(ob.TotalBalance ?? 0));

            var drSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == accountId
                    && x.e.VoucherEntryType == "Dr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate)
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            var crSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == accountId
                    && x.e.VoucherEntryType == "Cr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate)
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            return initial + drSum - crSum;
        }
    }
}
