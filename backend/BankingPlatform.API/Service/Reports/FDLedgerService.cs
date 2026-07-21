using BankingPlatform.API.Common;
using BankingPlatform.Infrastructure.Models.AccMasters;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class FDProductItem
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = "";
        public string ProductCode { get; set; } = "";
    }

    public class FDAccountItem
    {
        public int Id { get; set; }
        public string AccountIdentifier { get; set; } = "";
        public string AccountName { get; set; } = "";
    }

    public class FDDetailItem
    {
        public int Id { get; set; }
        public string DetailLabel { get; set; } = "";
        public DateTime FDDate { get; set; }
        public DateTime FDMaturityDate { get; set; }
        public decimal FDAmount { get; set; }
        public int FDStatus { get; set; }
    }

    public class FDLedgerEntryDTO
    {
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public string Particulars { get; set; } = "";
        public decimal? Dr { get; set; }
        public decimal? Cr { get; set; }
        public decimal Balance { get; set; }
        public string? Narration { get; set; }
    }

    public class FDLedgerDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccountIdentifier { get; set; } = "";
        public string ProductName { get; set; } = "";
        public int? SelectedDetailId { get; set; }
        public string? SelectedDetailLabel { get; set; }
        public DateTime? DetailFDDate { get; set; }
        public DateTime? DetailMaturityDate { get; set; }
        public decimal? DetailFDAmount { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public DateTime SessionFromDate { get; set; }
        public DateTime SessionToDate { get; set; }
        public decimal OpeningBalance { get; set; }
        public List<FDLedgerEntryDTO> Entries { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
        public decimal ClosingBalance { get; set; }
        // Account detail fields
        public string? RelativeName { get; set; }
        public string? ContactNo { get; set; }
        public string? Address { get; set; }
        public int? DetailLtdNo { get; set; }
        public int? DetailPeriodMonths { get; set; }
        public int? DetailPeriodDays { get; set; }
        public decimal? DetailIntRate { get; set; }
        public decimal? DetailMaturityAmount { get; set; }
    }

    public class FDLedgerService
    {
        private readonly BankingDbContext _context;

        public FDLedgerService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<(bool success, string message, List<FDProductItem>? data)> GetFDProductsAsync(int branchId)
        {
            var products = await _context.fdproduct.AsNoTracking()
                .Where(x => x.BranchId == branchId)
                .OrderBy(x => x.ProductName)
                .Select(x => new FDProductItem
                {
                    Id = x.Id,
                    ProductName = x.ProductName,
                    ProductCode = x.ProductCode
                })
                .ToListAsync();

            return (true, "OK", products);
        }

        public async Task<(bool success, string message, List<FDAccountItem>? data)> GetFDAccountsAsync(int branchId, int productId)
        {
            int fdType = (int)Enums.AccountTypes.FD;
            int bankFdType = (int)Enums.AccountTypes.BankFD;

            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                    && (x.AccTypeId == fdType || x.AccTypeId == bankFdType)
                    && x.GeneralProductId == productId
                    && !x.IsAccClosed)
                .OrderBy(x => x.AccSuffix)
                .Select(x => new FDAccountItem
                {
                    Id = x.ID,
                    AccountIdentifier = (x.AccPrefix ?? "") + "-" + (x.AccSuffix ?? 0),
                    AccountName = x.AccountName ?? ""
                })
                .ToListAsync();

            return (true, "OK", accounts);
        }

        public async Task<(bool success, string message, List<FDDetailItem>? data)> GetFDDetailsAsync(int branchId, int accountId)
        {
            var account = await _context.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == accountId);

            string accName = account?.AccountName ?? "";

            var details = await _context.fdaccountdetail.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccountId == accountId)
                .OrderBy(x => x.FDDate)
                .ThenBy(x => x.Id)
                .Select(x => new FDDetailItem
                {
                    Id = x.Id,
                    DetailLabel = accName + "-" + x.Id,
                    FDDate = x.FDDate,
                    FDMaturityDate = x.FDMaturityDate,
                    FDAmount = x.FDAmount,
                    FDStatus = x.FDStatus
                })
                .ToListAsync();

            return (true, "OK", details);
        }

        public async Task<(bool success, string message, FDLedgerDTO? data)> GetFDLedgerAsync(
            int branchId, int accountId, int? detailId, DateTime fromDate, DateTime toDate)
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
                ? await _context.fdproduct.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == account.GeneralProductId.Value)
                : null;

            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            string accountIdentifier = $"{account.AccPrefix}-{account.AccSuffix}";

            // ── Resolve effective date range and detail info ───────────────────
            FDDetailItem? selectedDetail = null;
            List<int>? detailVoucherIds = null;

            if (detailId.HasValue)
            {
                var detailRec = await _context.fdaccountdetail.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == detailId.Value && x.BranchId == branchId);

                if (detailRec == null)
                    return (false, "FD Detail not found.", null);

                selectedDetail = new FDDetailItem
                {
                    Id = detailRec.Id,
                    DetailLabel = (account.AccountName ?? "") + "-" + detailRec.Id,
                    FDDate = detailRec.FDDate,
                    FDMaturityDate = detailRec.FDMaturityDate,
                    FDAmount = detailRec.FDAmount,
                    FDStatus = detailRec.FDStatus
                };

                // Clamp user date range within this detail's lifespan
                if (fromDate.Date < detailRec.FDDate.Date)
                    fromDate = detailRec.FDDate.Date;
                if (toDate.Date > detailRec.FDMaturityDate.Date)
                    toDate = detailRec.FDMaturityDate.Date;

                // Get all voucher IDs that have entries for this specific FD detail
                detailVoucherIds = await _context.voucherfddetail.AsNoTracking()
                    .Where(x => x.FDAccDetId == detailId.Value && x.BrId == branchId)
                    .Select(x => x.VoucherId)
                    .Distinct()
                    .ToListAsync();
            }

            // Extra FD detail fields from the raw record
            FDAccountDetail? rawDetail = null;
            if (detailId.HasValue)
            {
                rawDetail = await _context.fdaccountdetail.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == detailId.Value && x.BranchId == branchId);
            }
            else
            {
                rawDetail = await _context.fdaccountdetail.AsNoTracking()
                    .Where(x => x.AccountId == accountId && x.BranchId == branchId)
                    .OrderByDescending(x => x.FDDate)
                    .FirstOrDefaultAsync();
            }

            decimal openingBalance = await CalculateOpeningBalanceAsync(branchId, accountId, fromDate.Date);

            DateTime toExclusive = toDate.Date.AddDays(1);

            var emptyResult = new FDLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                AccountName = account.AccountName ?? "",
                AccountIdentifier = accountIdentifier,
                ProductName = product?.ProductName ?? "",
                SelectedDetailId = selectedDetail?.Id,
                SelectedDetailLabel = selectedDetail?.DetailLabel,
                DetailFDDate = selectedDetail?.FDDate,
                DetailMaturityDate = selectedDetail?.FDMaturityDate,
                DetailFDAmount = selectedDetail?.FDAmount,
                FromDate = fromDate,
                ToDate = toDate,
                SessionFromDate = session?.fromdate ?? fromDate,
                SessionToDate = session?.todate ?? toDate,
                OpeningBalance = openingBalance,
                ClosingBalance = openingBalance,
                RelativeName        = account.RelativeName,
                ContactNo           = account.PhoneNo1,
                Address             = account.AddressLine,
                DetailLtdNo         = rawDetail?.LTDNo,
                DetailPeriodMonths  = rawDetail?.FDPeriodMonths,
                DetailPeriodDays    = rawDetail?.FDPeriodDays,
                DetailIntRate       = rawDetail?.IntRate,
                DetailMaturityAmount= rawDetail?.MaturityAmount,
            };

            // ── Fetch vouchers in the effective date range ─────────────────────
            var voucherQuery = _context.voucher.AsNoTracking()
                .Where(x => x.BrID == branchId
                    && x.VoucherDate >= fromDate.Date
                    && x.VoucherDate < toExclusive);

            // If a detail is selected, restrict to vouchers that touched that detail
            if (detailVoucherIds != null)
                voucherQuery = voucherQuery.Where(x => detailVoucherIds.Contains(x.Id));

            var voucherData = await voucherQuery
                .Select(x => new { x.Id, x.VoucherNo, x.VoucherDate })
                .ToListAsync();

            if (!voucherData.Any())
                return (true, "No transactions found.", emptyResult);

            var voucherIdList = voucherData.Select(v => v.Id).ToList();
            var voucherInfoMap = voucherData.ToDictionary(
                v => v.Id,
                v => new FDLVoucherInfo(v.VoucherNo, v.VoucherDate.Date));

            // Account entries for this account in the filtered vouchers
            var accountEntries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => voucherIdList.Contains(x.VoucherID) && x.AccountId == accountId)
                .ToListAsync();

            if (!accountEntries.Any())
                return (true, "No entries found for this account.", emptyResult);

            // Contra entries for Particulars column
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

            // ── Build running balance ──────────────────────────────────────────
            // FD is a liability (same as Saving): Cr = deposit → increases balance, Dr = decreases
            decimal runningBalance = openingBalance;
            var entries = new List<FDLedgerEntryDTO>();

            var sorted = accountEntries
                .OrderBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherDate ?? DateTime.MinValue)
                .ThenBy(e => voucherInfoMap.GetValueOrDefault(e.VoucherID)?.VoucherNo ?? 0)
                .ToList();

            foreach (var entry in sorted)
            {
                var info = voucherInfoMap.GetValueOrDefault(entry.VoucherID);
                if (info == null) continue;

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

                entries.Add(new FDLedgerEntryDTO
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

            return (true, "Success", new FDLedgerDTO
            {
                BranchName = branch.branchmaster_name,
                BranchAddress = branch.branchmaster_addressline,
                AccountName = account.AccountName ?? "",
                AccountIdentifier = accountIdentifier,
                ProductName = product?.ProductName ?? "",
                SelectedDetailId = selectedDetail?.Id,
                SelectedDetailLabel = selectedDetail?.DetailLabel,
                DetailFDDate = selectedDetail?.FDDate,
                DetailMaturityDate = selectedDetail?.FDMaturityDate,
                DetailFDAmount = selectedDetail?.FDAmount,
                FromDate = fromDate,
                ToDate = toDate,
                SessionFromDate = session?.fromdate ?? fromDate,
                SessionToDate = session?.todate ?? toDate,
                OpeningBalance = openingBalance,
                Entries = entries,
                TotalDr = totalDr,
                TotalCr = totalCr,
                ClosingBalance = runningBalance,
                RelativeName        = account.RelativeName,
                ContactNo           = account.PhoneNo1,
                Address             = account.AddressLine,
                DetailLtdNo         = rawDetail?.LTDNo,
                DetailPeriodMonths  = rawDetail?.FDPeriodMonths,
                DetailPeriodDays    = rawDetail?.FDPeriodDays,
                DetailIntRate       = rawDetail?.IntRate,
                DetailMaturityAmount= rawDetail?.MaturityAmount,
            });
        }

        private record FDLVoucherInfo(int VoucherNo, DateTime VoucherDate);

        private async Task<decimal> CalculateOpeningBalanceAsync(int branchId, int accountId, DateTime fromDate)
        {
            // Per-detail opening balance stored in fdaccountdetail (Cr = positive, Dr = negative)
            var detailOpeningBals = await _context.fdaccountdetail.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccountId == accountId && x.OpeningBalance != null)
                .Select(x => new { x.OpeningBalance, x.OpeningBalanceType })
                .ToListAsync();

            decimal initial = detailOpeningBals.Sum(x =>
                x.OpeningBalanceType?.ToUpper() == "CR"
                    ? (x.OpeningBalance ?? 0)
                    : -(x.OpeningBalance ?? 0));

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
