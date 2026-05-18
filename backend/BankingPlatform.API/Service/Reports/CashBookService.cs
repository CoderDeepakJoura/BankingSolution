using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class CashBookEntryDTO
    {
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public string ContraAccountName { get; set; } = "";
        public string ContraAccountIdentifier { get; set; } = "";
        public string? Narration { get; set; }
        public decimal Amount { get; set; }
    }

    public class CashBookDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public DateTime SessionFromDate { get; set; }
        public DateTime SessionToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public List<CashBookEntryDTO> Receipts { get; set; } = new();
        public List<CashBookEntryDTO> Payments { get; set; } = new();
        public decimal TotalReceipts { get; set; }
        public decimal TotalPayments { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class CashBookService
    {
        private readonly BankingDbContext _context;

        public CashBookService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<(bool success, string message, CashBookDTO? data)> GetCashBookAsync(
            int branchId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _context.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == branchId);
            if (branch == null)
                return (false, "Branch not found.", null);

            var generalSettings = await _context.generalsettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId);
            int cashAccountId = generalSettings?.defaultCashAccountId ?? 0;

            if (cashAccountId == 0)
                return (false, "Default cash account not configured in settings.", null);

            // Get the HeadCode of the cash account — this is what identifies cash entries in voucher details
            var cashAccount = await _context.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == cashAccountId);
            if (cashAccount == null)
                return (false, "Cash account not found.", null);

            long cashHeadCode = cashAccount.HeadCode;

            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            decimal openingBalance = await CalculateCashOpeningBalanceAsync(branchId, cashAccountId, cashHeadCode, fromDate.Date);

            DateTime toExclusive = toDate.Date.AddDays(1);

            var voucherData = await _context.voucher.AsNoTracking()
                .Where(x => x.BrID == branchId
                    && x.VoucherDate >= fromDate.Date
                    && x.VoucherDate < toExclusive)
                .Select(x => new { x.Id, x.VoucherNo, x.VoucherDate })
                .ToListAsync();

            var idList = voucherData.Select(v => v.Id).ToList();
            var voucherInfoMap = voucherData.ToDictionary(
                v => v.Id,
                v => new CbVoucherInfo(v.VoucherNo, v.VoucherDate.Date));

            if (!idList.Any())
            {
                return (true, "No vouchers found for this date range.", new CashBookDTO
                {
                    BranchName = branch.branchmaster_name,
                    BranchAddress = branch.branchmaster_addressline,
                    FromDate = fromDate,
                    ToDate = toDate,
                    SessionFromDate = session?.fromdate ?? fromDate,
                    SessionToDate = session?.todate ?? toDate,
                    OpeningBalance = openingBalance,
                    ClosingBalance = openingBalance
                });
            }

            var allEntries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => idList.Contains(x.VoucherID))
                .ToListAsync();

            // Cash entries = entries whose AccHeadCode matches the cash account's HeadCode
            var cashEntries = allEntries.Where(e => e.AccHeadCode == cashHeadCode).ToList();

            // Contra account IDs = all accounts on the non-cash side of the same vouchers
            var contraAccountIds = allEntries
                .Where(e => e.AccHeadCode != cashHeadCode)
                .Select(e => e.AccountId)
                .Distinct()
                .ToList();

            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => contraAccountIds.Contains(x.ID))
                .Select(x => new CbAccInfo
                {
                    Id = x.ID,
                    AccountName = x.AccountName ?? "",
                    AccountNumber = x.AccountNumber,
                    AccPrefix = x.AccPrefix ?? "",
                    AccSuffix = x.AccSuffix ?? 0,
                    AccTypeId = x.AccTypeId
                })
                .ToListAsync();

            int generalType = (int)Enums.AccountTypes.General;
            int loanType = (int)Enums.AccountTypes.Loan;

            // Group non-cash entries by VoucherID for quick contra lookup
            var nonCashByVoucher = allEntries
                .Where(e => e.AccHeadCode != cashHeadCode)
                .GroupBy(e => e.VoucherID)
                .ToDictionary(g => g.Key, g => g.ToList());

            var receipts = new List<CashBookEntryDTO>();
            var payments = new List<CashBookEntryDTO>();

            foreach (var cashEntry in cashEntries)
            {
                var info = voucherInfoMap.GetValueOrDefault(cashEntry.VoucherID);
                if (info == null) continue;

                // Dr cash entry = Receipt; contra is the Cr side of the same voucher (non-cash)
                // Cr cash entry = Payment; contra is the Dr side of the same voucher (non-cash)
                string contraType = cashEntry.VoucherEntryType == "Dr" ? "Cr" : "Dr";
                var contraEntries = nonCashByVoucher.GetValueOrDefault(cashEntry.VoucherID, new())
                    .Where(e => e.VoucherEntryType == contraType)
                    .ToList();

                string contraName;
                string contraIdentifier;

                if (contraEntries.Count == 0)
                {
                    contraName = "Unknown";
                    contraIdentifier = "";
                }
                else if (contraEntries.Count == 1)
                {
                    var acc = accounts.FirstOrDefault(a => a.Id == contraEntries[0].AccountId);
                    contraName = acc?.AccountName ?? "Unknown";
                    contraIdentifier = acc == null ? ""
                        : (acc.AccTypeId == generalType || acc.AccTypeId == loanType)
                            ? acc.AccountNumber
                            : $"{acc.AccPrefix}-{acc.AccSuffix}";
                }
                else
                {
                    var names = contraEntries
                        .Select(e => accounts.FirstOrDefault(a => a.Id == e.AccountId)?.AccountName ?? "Unknown")
                        .Distinct()
                        .ToList();
                    contraName = string.Join(" / ", names);
                    contraIdentifier = "Various";
                }

                var entry = new CashBookEntryDTO
                {
                    VoucherNo = info.VoucherNo,
                    VoucherDate = info.VoucherDate,
                    ContraAccountName = contraName,
                    ContraAccountIdentifier = contraIdentifier,
                    Narration = cashEntry.Narration,
                    Amount = cashEntry.VoucherAmount
                };

                if (cashEntry.VoucherEntryType == "Dr")
                    receipts.Add(entry);
                else
                    payments.Add(entry);
            }

            receipts = receipts.OrderBy(e => e.VoucherDate).ThenBy(e => e.VoucherNo).ToList();
            payments = payments.OrderBy(e => e.VoucherDate).ThenBy(e => e.VoucherNo).ToList();

            decimal totalReceipts = receipts.Sum(e => e.Amount);
            decimal totalPayments = payments.Sum(e => e.Amount);
            decimal closingBalance = openingBalance + totalReceipts - totalPayments;

            return (true, "Success", new CashBookDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                FromDate = fromDate,
                ToDate = toDate,
                SessionFromDate = session?.fromdate ?? fromDate,
                SessionToDate = session?.todate ?? toDate,
                OpeningBalance = openingBalance,
                Receipts = receipts,
                Payments = payments,
                TotalReceipts = totalReceipts,
                TotalPayments = totalPayments,
                ClosingBalance = closingBalance
            });
        }

        private record CbVoucherInfo(int VoucherNo, DateTime VoucherDate);

        private class CbAccInfo
        {
            public int Id { get; set; }
            public string AccountName { get; set; } = "";
            public string AccountNumber { get; set; } = "";
            public string AccPrefix { get; set; } = "";
            public int AccSuffix { get; set; }
            public int AccTypeId { get; set; }
        }

        private async Task<decimal> CalculateCashOpeningBalanceAsync(
            int branchId, int cashAccountId, long cashHeadCode, DateTime fromDate)
        {
            // OB record is tied to the specific cash account
            var ob = await _context.accopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccountId == cashAccountId);

            decimal initial = ob == null ? 0
                : (ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount);

            // Dr/Cr sums filtered by cashHeadCode — consistent with how entries are identified
            var drSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccHeadCode == cashHeadCode
                    && x.e.VoucherEntryType == "Dr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate)
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            var crSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccHeadCode == cashHeadCode
                    && x.e.VoucherEntryType == "Cr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate)
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            return initial + drSum - crSum;
        }
    }
}
