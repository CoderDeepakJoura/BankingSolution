using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class BankFDAccountSearchItem
    {
        public int Id { get; set; }
        public string AccountIdentifier { get; set; } = "";
        public string AccountName { get; set; } = "";
    }

    public class BankFDDetailSearchItem
    {
        public int Id { get; set; }
        public string DetailLabel { get; set; } = "";
        public string LTDNo { get; set; } = "";
        public decimal? SerialNo { get; set; }
        public DateTime FDDate { get; set; }
        public DateTime FDMaturityDate { get; set; }
        public decimal FDAmount { get; set; }
        public decimal MaturityAmount { get; set; }
        public double IntRate { get; set; }
        public int FDPeriodMonths { get; set; }
        public int FDPeriodDays { get; set; }
        public int FDStatus { get; set; }
    }

    public class BankFDLedgerEntryDTO
    {
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public string Particulars { get; set; } = "";
        public string Operation { get; set; } = "";
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal Balance { get; set; }
        public string? Narration { get; set; }
    }

    public class BankFDLedgerDTO
    {
        public string BranchName { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccountIdentifier { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public List<BankFDLedgerEntryDTO> Entries { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
        public decimal ClosingBalance { get; set; }
        public int? SelectedDetailId { get; set; }
        public string? LTDNo { get; set; }
        public decimal? SerialNo { get; set; }
        public decimal? FDAmount { get; set; }
        public double? IntRate { get; set; }
        public int? FDPeriodMonths { get; set; }
        public int? FDPeriodDays { get; set; }
        public DateTime? FDDate { get; set; }
        public DateTime? FDMaturityDate { get; set; }
        public decimal? MaturityAmount { get; set; }
        public int? FDStatus { get; set; }
        public string? RelativeName { get; set; }
        public string? ContactNo { get; set; }
    }

    public class BankFDLedgerService
    {
        private readonly BankingDbContext _context;

        public BankFDLedgerService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<List<BankFDAccountSearchItem>> GetAccountsAsync(int branchId, string? query, DateTime? fromDate, DateTime? toDate)
        {
            var q = _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccTypeId == 8 && x.IsAccClosed != true);

            if (!string.IsNullOrWhiteSpace(query))
            {
                string lower = query.ToLower();
                q = q.Where(x => (x.AccountName ?? "").ToLower().Contains(lower)
                    || x.AccSuffix.ToString().Contains(lower));
            }

            // Filter to accounts that have at least one FD detail with FDDate in the selected range
            if (fromDate.HasValue || toDate.HasValue)
            {
                var detailQuery = _context.bankfdaccountdetail.AsNoTracking()
                    .Where(d => d.BrId == branchId);
                if (fromDate.HasValue)
                    detailQuery = detailQuery.Where(d => d.FDDate >= fromDate.Value.Date);
                if (toDate.HasValue)
                    detailQuery = detailQuery.Where(d => d.FDDate <= toDate.Value.Date);

                var relevantAccIds = await detailQuery.Select(d => d.AccId).Distinct().ToListAsync();
                q = q.Where(x => relevantAccIds.Contains(x.ID));
            }

            return await q.OrderBy(x => x.AccSuffix)
                .Select(x => new BankFDAccountSearchItem
                {
                    Id = x.ID,
                    AccountIdentifier = (x.AccPrefix ?? "BFD") + "-" + x.AccSuffix,
                    AccountName = x.AccountName ?? ""
                })
                .ToListAsync();
        }

        public async Task<List<BankFDDetailSearchItem>> GetDetailsAsync(int branchId, int accountId)
        {
            return await _context.bankfdaccountdetail.AsNoTracking()
                .Where(x => x.BrId == branchId && x.AccId == accountId)
                .OrderBy(x => x.FDDate)
                .ThenBy(x => x.ID)
                .Select(x => new BankFDDetailSearchItem
                {
                    Id = x.ID,
                    DetailLabel = (x.LTDNo != null && x.LTDNo != "" ? x.LTDNo : x.ID.ToString()),
                    LTDNo = x.LTDNo ?? "",
                    SerialNo = x.SerialNo,
                    FDDate = x.FDDate,
                    FDMaturityDate = x.FDMaturityDate,
                    FDAmount = x.FDAmount,
                    MaturityAmount = x.MaturityAmount,
                    IntRate = x.IntRate,
                    FDPeriodMonths = x.FDPeriodMonths,
                    FDPeriodDays = x.FDPeriodDays,
                    FDStatus = x.FDStatus
                })
                .ToListAsync();
        }

        public async Task<(bool success, string message, BankFDLedgerDTO? data)> GetLedgerAsync(
            int branchId, int accountId, int? detailId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _context.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == branchId);
            if (branch == null) return (false, "Branch not found.", null);

            var account = await _context.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == accountId);
            if (account == null) return (false, "Account not found.", null);

            string accountIdentifier = $"{account.AccPrefix ?? "BFD"}-{account.AccSuffix}";

            var selectedDetail = detailId.HasValue
                ? await _context.bankfdaccountdetail.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ID == detailId.Value && x.BrId == branchId)
                : await _context.bankfdaccountdetail.AsNoTracking()
                    .Where(x => x.AccId == accountId && x.BrId == branchId)
                    .OrderByDescending(x => x.FDDate)
                    .FirstOrDefaultAsync();

            decimal openingBalance = await CalculateOpeningBalanceAsync(branchId, accountId, detailId, fromDate);

            var emptyResult = new BankFDLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                AccountName = account.AccountName ?? "",
                AccountIdentifier = accountIdentifier,
                FromDate = fromDate,
                ToDate = toDate,
                OpeningBalance = openingBalance,
                ClosingBalance = openingBalance,
                SelectedDetailId = selectedDetail?.ID,
                LTDNo = selectedDetail?.LTDNo,
                SerialNo = selectedDetail?.SerialNo,
                FDAmount = selectedDetail?.FDAmount,
                IntRate = selectedDetail?.IntRate,
                FDPeriodMonths = selectedDetail?.FDPeriodMonths,
                FDPeriodDays = selectedDetail?.FDPeriodDays,
                FDDate = selectedDetail?.FDDate,
                FDMaturityDate = selectedDetail?.FDMaturityDate,
                MaturityAmount = selectedDetail?.MaturityAmount,
                FDStatus = selectedDetail?.FDStatus,
                RelativeName = account.RelativeName,
                ContactNo = account.PhoneNo1,
            };

            DateTime toExclusive = toDate.Date.AddDays(1);

            // Determine which vouchercreditdebitdetails entry IDs are linked to the selected detail
            List<int>? filteredEntryIds = null;
            if (detailId.HasValue)
            {
                filteredEntryIds = await _context.voucherbfddetail.AsNoTracking()
                    .Where(x => x.FDAccDetId == detailId.Value && x.BrId == branchId)
                    .Select(x => x.VAccCrDrId)
                    .ToListAsync();

                if (!filteredEntryIds.Any())
                    return (true, "No transactions found for this FD detail.", emptyResult);
            }

            // Get account entries within date range
            var entryQuery = _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.AccountId == accountId);
            if (filteredEntryIds != null)
                entryQuery = entryQuery.Where(x => filteredEntryIds.Contains(x.Id));

            var joined = await (
                from entry in entryQuery
                join v in _context.voucher.AsNoTracking()
                    .Where(v => v.BrID == branchId
                        && v.VoucherDate >= fromDate.Date
                        && v.VoucherDate < toExclusive
                        && v.VoucherStatus != "D")
                    on entry.VoucherID equals v.Id
                select new
                {
                    EntryId = entry.Id,
                    entry.VoucherID,
                    entry.VoucherAmount,
                    entry.VoucherEntryType,
                    entry.Narration,
                    v.VoucherNo,
                    v.VoucherDate
                }
            ).ToListAsync();

            if (!joined.Any())
                return (true, "No transactions found.", emptyResult);

            // Map VAccCrDrId → Operation from voucherbfddetail
            var entryIds = joined.Select(x => x.EntryId).ToList();
            var operationMap = await _context.voucherbfddetail.AsNoTracking()
                .Where(x => entryIds.Contains(x.VAccCrDrId))
                .Select(x => new { x.VAccCrDrId, x.Operation })
                .ToDictionaryAsync(x => x.VAccCrDrId, x => x.Operation);

            // Contra accounts for Particulars column
            var voucherIds = joined.Select(x => x.VoucherID).Distinct().ToList();
            var contraEntries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => voucherIds.Contains(x.VoucherID) && x.AccountId != accountId)
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
            var entries = new List<BankFDLedgerEntryDTO>();

            var sorted = joined
                .OrderBy(x => x.VoucherDate.Date)
                .ThenBy(x => x.VoucherNo)
                .ToList();

            foreach (var item in sorted)
            {
                string contraType = item.VoucherEntryType == "Cr" ? "Dr" : "Cr";
                var contras = contraByVoucher.GetValueOrDefault(item.VoucherID, new())
                    .Where(e => e.VoucherEntryType == contraType)
                    .Select(e => accountNameMap.GetValueOrDefault(e.AccountId, ""))
                    .Where(n => !string.IsNullOrEmpty(n))
                    .Distinct()
                    .ToList();
                string particulars = contras.Any() ? string.Join(" / ", contras) : "—";

                decimal? dr = item.VoucherEntryType == "Dr" ? item.VoucherAmount : (decimal?)null;
                decimal? cr = item.VoucherEntryType == "Cr" ? item.VoucherAmount : (decimal?)null;

                if (cr.HasValue) runningBalance += cr.Value;
                else if (dr.HasValue) runningBalance -= dr.Value;

                entries.Add(new BankFDLedgerEntryDTO
                {
                    VoucherNo = item.VoucherNo,
                    VoucherDate = item.VoucherDate.Date,
                    Particulars = particulars,
                    Operation = operationMap.GetValueOrDefault(item.EntryId, ""),
                    Dr = dr,
                    Cr = cr,
                    Balance = runningBalance,
                    Narration = item.Narration
                });
            }

            decimal totalDr = entries.Sum(e => e.Dr ?? 0);
            decimal totalCr = entries.Sum(e => e.Cr ?? 0);

            return (true, "Success", new BankFDLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                AccountName = account.AccountName ?? "",
                AccountIdentifier = accountIdentifier,
                FromDate = fromDate,
                ToDate = toDate,
                OpeningBalance = openingBalance,
                Entries = entries,
                TotalDr = totalDr,
                TotalCr = totalCr,
                ClosingBalance = runningBalance,
                SelectedDetailId = selectedDetail?.ID,
                LTDNo = selectedDetail?.LTDNo,
                SerialNo = selectedDetail?.SerialNo,
                FDAmount = selectedDetail?.FDAmount,
                IntRate = selectedDetail?.IntRate,
                FDPeriodMonths = selectedDetail?.FDPeriodMonths,
                FDPeriodDays = selectedDetail?.FDPeriodDays,
                FDDate = selectedDetail?.FDDate,
                FDMaturityDate = selectedDetail?.FDMaturityDate,
                MaturityAmount = selectedDetail?.MaturityAmount,
                FDStatus = selectedDetail?.FDStatus,
                RelativeName = account.RelativeName,
                ContactNo = account.PhoneNo1,
            });
        }

        private async Task<decimal> CalculateOpeningBalanceAsync(int branchId, int accountId, int? detailId, DateTime fromDate)
        {
            // Sum opening balances (always Cr / positive for Bank FD)
            var obQuery = _context.bankfdaccountopeningbalance.AsNoTracking()
                .Where(x => x.BranchID == branchId && x.AccountId == accountId);
            if (detailId.HasValue)
                obQuery = obQuery.Where(x => x.FDAccDetId == detailId.Value);

            decimal initial = await obQuery.SumAsync(x => x.Balance);

            // Add voucher movements that occurred before fromDate
            var entryQuery = _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.AccountId == accountId);

            if (detailId.HasValue)
            {
                var detailEntryIds = await _context.voucherbfddetail.AsNoTracking()
                    .Where(x => x.FDAccDetId == detailId.Value && x.BrId == branchId)
                    .Select(x => x.VAccCrDrId)
                    .ToListAsync();
                entryQuery = entryQuery.Where(x => detailEntryIds.Contains(x.Id));
            }

            var beforeEntries = await (
                from entry in entryQuery
                join v in _context.voucher.AsNoTracking() on entry.VoucherID equals v.Id
                where v.BrID == branchId && v.VoucherDate < fromDate.Date && v.VoucherStatus != "D"
                select new { entry.VoucherAmount, entry.VoucherEntryType }
            ).ToListAsync();

            foreach (var e in beforeEntries)
            {
                if (e.VoucherEntryType == "Cr") initial += e.VoucherAmount;
                else initial -= e.VoucherAmount;
            }

            return initial;
        }
    }
}
