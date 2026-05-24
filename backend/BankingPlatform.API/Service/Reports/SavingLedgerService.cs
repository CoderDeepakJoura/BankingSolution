using BankingPlatform.API.Common;
using BankingPlatform.Infrastructure.Models.member;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class SavingProductItem
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
        public string ProductCode { get; set; } = "";
    }

    public class SavingAccountItem
    {
        public int Id { get; set; }
        public string AccountIdentifier { get; set; } = "";
        public string AccountName { get; set; } = "";
    }

    public class SavingLedgerEntryDTO
    {
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public string Particulars { get; set; } = "";
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal Balance { get; set; }
        public string? Narration { get; set; }
    }

    public class SavingLedgerDTO
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
        public List<SavingLedgerEntryDTO> Entries { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
        public decimal ClosingBalance { get; set; }
        // Account detail fields
        public string? RelativeName { get; set; }
        public string? ContactNo { get; set; }
        public string? Address { get; set; }
        public string? MembershipNo { get; set; }
        public DateTime? AccOpeningDate { get; set; }
        public string? Occupation { get; set; }
    }

    public class SavingLedgerService
    {
        private readonly BankingDbContext _context;

        public SavingLedgerService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<(bool success, string message, List<SavingProductItem>? data)> GetSavingProductsAsync(int branchId)
        {
            var products = await _context.savingproduct.AsNoTracking()
                .Where(x => x.BranchId == branchId)
                .OrderBy(x => x.ProductName)
                .Select(x => new SavingProductItem
                {
                    Id = x.Id,
                    ProductName = x.ProductName,
                    ProductCode = x.ProductCode
                })
                .ToListAsync();

            return (true, "OK", products);
        }

        public async Task<(bool success, string message, List<SavingAccountItem>? data)> GetSavingAccountsAsync(int branchId, int productId)
        {
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                    && x.AccTypeId == (int)Enums.AccountTypes.Saving
                    && x.GeneralProductId == productId
                    && !x.IsAccClosed)
                .OrderBy(x => x.AccSuffix)
                .Select(x => new SavingAccountItem
                {
                    Id = x.ID,
                    AccountIdentifier = (x.AccPrefix ?? "") + "-" + (x.AccSuffix ?? 0),
                    AccountName = x.AccountName ?? ""
                })
                .ToListAsync();

            return (true, "OK", accounts);
        }

        public async Task<(bool success, string message, SavingLedgerDTO? data)> GetSavingLedgerAsync(
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
                ? await _context.savingproduct.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == account.GeneralProductId.Value)
                : null;

            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            string accountIdentifier = $"{account.AccPrefix}-{account.AccSuffix}";

            // ── Member info ────────────────────────────────────────────────────
            string membershipNo = "";
            string occupation = "";
            if (account.MemberId.HasValue && account.MemberBranchID.HasValue)
            {
                var member = await _context.member.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == account.MemberId.Value && x.BranchId == account.MemberBranchID.Value);
                if (member != null)
                {
                    membershipNo = member.PermanentMembershipNo ?? member.NominalMembershipNo ?? "";
                    var occ = await _context.occupation.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.id == member.OccupationId);
                    occupation = occ?.description ?? "";
                }
            }

            decimal openingBalance = await CalculateOpeningBalanceAsync(branchId, accountId, fromDate.Date);

            DateTime toExclusive = toDate.Date.AddDays(1);

            var emptyResult = new SavingLedgerDTO
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
                ClosingBalance = openingBalance,
                RelativeName   = account.RelativeName,
                ContactNo      = account.PhoneNo1,
                Address        = account.AddressLine,
                MembershipNo   = membershipNo,
                AccOpeningDate = account.AccOpeningDate,
                Occupation     = occupation,
            };

            // Get vouchers in date range for this branch
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
                v => new SLVoucherInfo(v.VoucherNo, v.VoucherDate.Date));

            // Get this account's entries only
            var accountEntries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => voucherIdList.Contains(x.VoucherID) && x.AccountId == accountId)
                .ToListAsync();

            if (!accountEntries.Any())
                return (true, "No entries found for this account.", emptyResult);

            // Get contra entries for those vouchers (for Particulars)
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

            // Build ledger entries with running balance
            decimal runningBalance = openingBalance;
            var entries = new List<SavingLedgerEntryDTO>();

            var sorted = accountEntries
                .OrderBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherDate ?? DateTime.MinValue)
                .ThenBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherNo ?? 0)
                .ToList();

            foreach (var entry in sorted)
            {
                var info = voucherInfoMap.GetValueOrDefault(entry.VoucherID);
                if (info == null) continue;

                // Cr saving = deposit (contra is Dr side); Dr saving = withdrawal (contra is Cr side)
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

                entries.Add(new SavingLedgerEntryDTO
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

            return (true, "Success", new SavingLedgerDTO
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
                ClosingBalance = runningBalance,
                RelativeName   = account.RelativeName,
                ContactNo      = account.PhoneNo1,
                Address        = account.AddressLine,
                MembershipNo   = membershipNo,
                AccOpeningDate = account.AccOpeningDate,
                Occupation     = occupation,
            });
        }

        private record SLVoucherInfo(int VoucherNo, DateTime VoucherDate);

        private async Task<decimal> CalculateOpeningBalanceAsync(int branchId, int accountId, DateTime fromDate)
        {
            var ob = await _context.accopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccountId == accountId);

            // Saving account: Cr OB = positive balance (depositor's money), Dr OB = negative
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
