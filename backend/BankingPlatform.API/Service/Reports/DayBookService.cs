using BankingPlatform.API.Common;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class DayBookEntryDTO
    {
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public long AccHeadCode { get; set; }
        public string AccHeadName { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccountIdentifier { get; set; } = "";
        public string? Narration { get; set; }
        public decimal Amount { get; set; }
    }

    public class DayBookGroupDTO
    {
        public string GroupName { get; set; } = "";
        public decimal GroupTotal { get; set; }
        public List<DayBookEntryDTO> Entries { get; set; } = new();
    }

    public class DayBookDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public DateTime SessionFromDate { get; set; }
        public DateTime SessionToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public List<DayBookGroupDTO> ReceiptGroups { get; set; } = new();
        public List<DayBookGroupDTO> PaymentGroups { get; set; } = new();
        public decimal TotalReceipts { get; set; }
        public decimal TotalPayments { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class SessionDatesDTO
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public bool IsFirst { get; set; }
    }

    public class DayBookService
    {
        private readonly BankingDbContext _context;

        public DayBookService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<(bool success, string message, SessionDatesDTO? data)> GetSessionDatesAsync(int branchId)
        {
            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            if (session == null)
                return (false, "No active session found.", null);

            return (true, "OK", new SessionDatesDTO
            {
                FromDate = session.fromdate,
                ToDate = session.todate,
                IsFirst = session.isfirst
            });
        }

        public async Task<(bool success, string message, DayBookDTO? data)> GetDayBookAsync(
            int branchId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _context.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == branchId);
            if (branch == null)
                return (false, "Branch not found.", null);

            var generalSettings = await _context.generalsettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId);
            int cashAccountId = generalSettings?.defaultCashAccountId ?? 0;

            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            decimal openingBalance = await CalculateOpeningBalanceAsync(branchId, cashAccountId, fromDate.Date);

            DateTime toExclusive = toDate.Date.AddDays(1);

            var voucherData = await _context.voucher.AsNoTracking()
                .Where(x => x.BrID == branchId
                    && x.VoucherDate >= fromDate.Date
                    && x.VoucherDate < toExclusive
                    && x.VoucherStatus == "V")
                .Select(x => new { x.Id, x.VoucherNo, x.VoucherDate })
                .ToListAsync();

            var idList = voucherData.Select(v => v.Id).ToList();
            var voucherInfoMap = voucherData.ToDictionary(
                v => v.Id,
                v => new VoucherInfo(v.VoucherNo, v.VoucherDate.Date));

            if (!idList.Any())
            {
                return (true, "No vouchers found for this date range.", new DayBookDTO
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

            var entries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => idList.Contains(x.VoucherID))
                .ToListAsync();

            var accountIds = entries.Select(e => e.AccountId).Distinct().ToList();
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => accountIds.Contains(x.ID))
                .Select(x => new AccInfo
                {
                    Id = x.ID,
                    AccountName = x.AccountName ?? "",
                    AccountNumber = x.AccountNumber,
                    AccPrefix = x.AccPrefix ?? "",
                    AccSuffix = x.AccSuffix ?? 0,
                    AccTypeId = x.AccTypeId
                })
                .ToListAsync();

            var headCodes = entries.Select(e => e.AccHeadCode).Distinct().ToList();
            var headRows = await _context.accounthead.AsNoTracking()
                .Where(x => headCodes.Contains(x.headcode))
                .Select(x => new { x.headcode, x.name, x.branchid })
                .ToListAsync();
            // Prefer branch-specific entry; fall back to any matching head code
            var headNameMap = headRows
                .GroupBy(x => x.headcode)
                .ToDictionary(
                    g => g.Key,
                    g => (g.FirstOrDefault(x => x.branchid == branchId) ?? g.First()).name);

            int generalType = (int)Enums.AccountTypes.General;
            int loanType = (int)Enums.AccountTypes.Loan;

            // Exclude cash head entries (head code starting with 110) — same as SP logic
            // LEFT(AccHeadCode, 3) <> 110 in the stored procedures
            var crEntries = entries.Where(e => e.VoucherEntryType == "Cr" && !e.AccHeadCode.ToString().StartsWith("110")).ToList();
            var drEntries = entries.Where(e => e.VoucherEntryType == "Dr" && !e.AccHeadCode.ToString().StartsWith("110")).ToList();

            var receiptGroups = BuildGroups(crEntries, accounts, voucherInfoMap, headNameMap, generalType, loanType);
            var paymentGroups = BuildGroups(drEntries, accounts, voucherInfoMap, headNameMap, generalType, loanType);

            decimal totalReceipts = receiptGroups.Sum(g => g.GroupTotal);
            decimal totalPayments = paymentGroups.Sum(g => g.GroupTotal);
            decimal closingBalance = openingBalance + totalReceipts - totalPayments;

            return (true, "Success", new DayBookDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                FromDate = fromDate,
                ToDate = toDate,
                SessionFromDate = session?.fromdate ?? fromDate,
                SessionToDate = session?.todate ?? toDate,
                OpeningBalance = openingBalance,
                ReceiptGroups = receiptGroups,
                PaymentGroups = paymentGroups,
                TotalReceipts = totalReceipts,
                TotalPayments = totalPayments,
                ClosingBalance = closingBalance
            });
        }

        private record VoucherInfo(int VoucherNo, DateTime VoucherDate);

        private class AccInfo
        {
            public int Id { get; set; }
            public string AccountName { get; set; } = "";
            public string AccountNumber { get; set; } = "";
            public string AccPrefix { get; set; } = "";
            public int AccSuffix { get; set; }
            public int AccTypeId { get; set; }
        }

        private static List<DayBookGroupDTO> BuildGroups(
            List<VoucherCreditDebitDetails> entries,
            List<AccInfo> accounts,
            Dictionary<int, VoucherInfo> voucherInfoMap,
            Dictionary<long, string> headNameMap,
            int generalType, int loanType)
        {
            var result = new List<DayBookGroupDTO>();

            var grouped = entries
                .GroupBy(e => accounts.FirstOrDefault(a => a.Id == e.AccountId)?.AccTypeId ?? 0)
                .OrderBy(g => g.Key);

            foreach (var group in grouped)
            {
                var items = group
                    .OrderBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherDate ?? DateTime.MinValue)
                    .ThenBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherNo ?? 0)
                    .Select(entry =>
                    {
                        var acc = accounts.FirstOrDefault(a => a.Id == entry.AccountId);
                        var info = voucherInfoMap.GetValueOrDefault(entry.VoucherID);
                        int voucherNo = info?.VoucherNo ?? 0;
                        DateTime voucherDate = info?.VoucherDate ?? DateTime.MinValue;
                        string identifier = acc == null ? entry.AccountId.ToString()
                            : (acc.AccTypeId == generalType || acc.AccTypeId == loanType)
                                ? acc.AccountNumber
                                : $"{acc.AccPrefix}-{acc.AccSuffix}";
                        return new DayBookEntryDTO
                        {
                            VoucherNo = voucherNo,
                            VoucherDate = voucherDate,
                            AccHeadCode = entry.AccHeadCode,
                            AccHeadName = headNameMap.GetValueOrDefault(entry.AccHeadCode, "Unknown"),
                            AccountName = acc?.AccountName ?? "Unknown",
                            AccountIdentifier = identifier,
                            Narration = entry.Narration,
                            Amount = entry.VoucherAmount
                        };
                    }).ToList();

                result.Add(new DayBookGroupDTO
                {
                    GroupName = GetAccountTypeName(group.Key),
                    GroupTotal = items.Sum(i => i.Amount),
                    Entries = items
                });
            }

            return result;
        }

        private async Task<decimal> CalculateOpeningBalanceAsync(int branchId, int cashAccountId, DateTime fromDate)
        {
            if (cashAccountId == 0) return 0;

            var ob = await _context.accopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccountId == cashAccountId);

            decimal initial = ob == null ? 0
                : (ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount);

            var drSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == cashAccountId
                    && x.e.VoucherEntryType == "Dr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate
                    && x.v.VoucherStatus == "V")
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            var crSum = await _context.vouchercreditdebitdetails
                .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                .Where(x => x.e.AccountId == cashAccountId
                    && x.e.VoucherEntryType == "Cr"
                    && x.v.BrID == branchId
                    && x.v.VoucherDate < fromDate
                    && x.v.VoucherStatus == "V")
                .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0;

            return initial + drSum - crSum;
        }

        private static string GetAccountTypeName(int typeId) => typeId switch
        {
            1 => "Loan",
            2 => "Saving",
            3 => "General",
            4 => "Share Capital",
            5 => "Recurring Deposit",
            6 => "Fixed Deposit",
            7 => "Bank FD",
            _ => "Other"
        };
    }
}
