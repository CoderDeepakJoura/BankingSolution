using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Vouchers
{
    public class VoucherPreviewEntryDTO
    {
        public string EntryType { get; set; } = "";
        public int AccountId { get; set; }
        public string AccountName { get; set; } = "";
        public string AccountIdentifier { get; set; } = "";
        public decimal Amount { get; set; }
        public string? Narration { get; set; }
        public bool IsAccClosed { get; set; }
        public int AccountType { get; set; }
        public int? GeneralProductId { get; set; }
    }

    public class VoucherPreviewDTO
    {
        public int VoucherId { get; set; }
        public int VoucherNo { get; set; }
        public DateTime VoucherDate { get; set; }
        public int VoucherType { get; set; }
        public int VoucherSubType { get; set; }
        public string VoucherTypeName { get; set; } = "";
        public string VoucherSubTypeName { get; set; } = "";
        public string? Narration { get; set; }
        public string Status { get; set; } = "";
        public bool DeleteOnly { get; set; }
        public bool HasClosedAccounts { get; set; }
        public decimal? PenaltyAmount { get; set; }
        public List<VoucherPreviewEntryDTO> Entries { get; set; } = new();
    }

    public class VoucherOperationsService
    {
        private readonly BankingDbContext _context;

        public VoucherOperationsService(BankingDbContext context)
        {
            _context = context;
        }

        public async Task<(bool success, string message, VoucherPreviewDTO? data)> GetPreviewAsync(int branchId, int voucherNo, DateTime voucherDate)
        {
            var voucher = await _context.voucher.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BrID == branchId && x.VoucherNo == voucherNo
                    && x.VoucherDate.Date == voucherDate.Date);

            if (voucher == null)
                return (false, "Voucher not found for the given date and branch.", null);

            var entries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.VoucherID == voucher.Id)
                .OrderBy(x => x.VoucherSeqNo)
                .ToListAsync();

            var accountIds = entries.Select(e => e.AccountId).Distinct().ToList();
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => accountIds.Contains(x.ID))
                .Select(x => new { x.ID, x.AccountName, x.AccountNumber, x.AccPrefix, x.AccSuffix, x.AccTypeId, x.IsAccClosed, x.GeneralProductId })
                .ToListAsync();

            int generalType = (int)Enums.AccountTypes.General;
            int loanType = (int)Enums.AccountTypes.Loan;
            int shareMoneyType = (int)Enums.AccountTypes.ShareMoney;

            var entryDTOs = entries.Select(e =>
            {
                var acc = accounts.FirstOrDefault(a => a.ID == e.AccountId);
                string identifier = acc == null
                    ? e.AccountId.ToString()
                    : (acc.AccTypeId == generalType || acc.AccTypeId == loanType || acc.AccTypeId == shareMoneyType)
                        ? acc.AccountNumber ?? e.AccountId.ToString()
                        : $"{acc.AccPrefix}-{acc.AccSuffix}";

                return new VoucherPreviewEntryDTO
                {
                    EntryType = e.VoucherEntryType,
                    AccountId = e.AccountId,
                    AccountName = acc?.AccountName ?? "Unknown Account",
                    AccountIdentifier = identifier,
                    Amount = e.VoucherAmount,
                    Narration = e.Narration,
                    IsAccClosed = acc?.IsAccClosed ?? false,
                    AccountType = acc?.AccTypeId ?? 0,
                    GeneralProductId = acc?.GeneralProductId
                };
            }).ToList();

            bool deleteOnly = IsDeleteOnly(voucher.VoucherType, voucher.VoucherSubType);
            bool hasClosedAccounts = !IsDeleteOnly(voucher.VoucherType, voucher.VoucherSubType)
                && entryDTOs.Any(e => e.IsAccClosed);

            decimal? penaltyAmount = null;
            if (voucher.VoucherType == (int)Enums.VoucherType.RD && voucher.VoucherSubType == (int)Enums.VoucherSubType.Kist)
            {
                var rdDetail = await _context.voucherrddetail
                    .AsNoTracking()
                    .Where(x => x.VoucherId == voucher.Id)
                    .FirstOrDefaultAsync();
                penaltyAmount = rdDetail?.PenalAmt;
            }

            return (true, "Success", new VoucherPreviewDTO
            {
                VoucherId = voucher.Id,
                VoucherNo = voucher.VoucherNo,
                VoucherDate = voucher.VoucherDate,
                VoucherType = voucher.VoucherType,
                VoucherSubType = voucher.VoucherSubType,
                VoucherTypeName = GetVoucherTypeName(voucher.VoucherType),
                VoucherSubTypeName = GetVoucherSubTypeName(voucher.VoucherSubType),
                Narration = voucher.VoucherNarration,
                Status = voucher.VoucherStatus,
                DeleteOnly = deleteOnly,
                HasClosedAccounts = hasClosedAccounts,
                PenaltyAmount = penaltyAmount,
                Entries = entryDTOs
            });
        }

        public async Task<(bool success, string message)> DeleteVoucherAsync(int branchId, int voucherNo, DateTime voucherDate)
        {
            var voucher = await _context.voucher
                .FirstOrDefaultAsync(x => x.BrID == branchId && x.VoucherNo == voucherNo
                    && x.VoucherDate.Date == voucherDate.Date);

            if (voucher == null)
                return (false, "Voucher not found.");

            // AsNoTracking: entries are only read for account-ID lookups; the DB CASCADE deletes
            // them automatically when the voucher is deleted, so we must NOT track them.
            var entries = await _context.vouchercreditdebitdetails.AsNoTracking()
                .Where(x => x.VoucherID == voucher.Id)
                .ToListAsync();

            int vType = voucher.VoucherType;
            int vSubType = voucher.VoucherSubType;
            bool isMatureOrPremature = IsDeleteOnly(vType, vSubType);

            // Account closed check — skip for mature/premature since those accounts are expected to be closed
            if (!isMatureOrPremature)
            {
                var accountIds = entries.Select(e => e.AccountId).Distinct().ToList();
                var closedAccs = await _context.accountmaster.AsNoTracking()
                    .Where(x => accountIds.Contains(x.ID) && x.IsAccClosed)
                    .Select(x => x.AccountName)
                    .ToListAsync();

                if (closedAccs.Any())
                    return (false, $"Cannot delete: account(s) already closed — {string.Join(", ", closedAccs)}.");
            }

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Delete saving detail entries (no FK constraint to voucher)
                var savingDetails = await _context.vouchersavingdetail
                    .Where(x => x.VoucherId == voucher.Id).ToListAsync();
                if (savingDetails.Any()) _context.vouchersavingdetail.RemoveRange(savingDetails);

                // Delete RD detail entries (ON DELETE RESTRICT — must go before voucher)
                var rdDetails = await _context.voucherrddetail
                    .Where(x => x.VoucherId == voucher.Id).ToListAsync();
                if (rdDetails.Any()) _context.voucherrddetail.RemoveRange(rdDetails);

                // Delete FD voucher detail entries (ON DELETE RESTRICT — must go before voucher)
                var fdVoucherDetails = await _context.voucherfddetail
                    .Where(x => x.VoucherId == voucher.Id && x.BrId == branchId).ToListAsync();
                if (fdVoucherDetails.Any()) _context.voucherfddetail.RemoveRange(fdVoucherDetails);

                // Flush RESTRICT-constrained children first so the voucher delete succeeds
                await _context.SaveChangesAsync();

                // FD mature / premature / renew — reopen the FD account
                if (vType == (int)Enums.VoucherType.FD && isMatureOrPremature)
                {
                    var fdAccountIds = entries.Select(e => e.AccountId).Distinct().ToList();

                    var fdDetails = await _context.fdaccountdetail
                        .Where(x => fdAccountIds.Contains(x.AccountId) && x.FDStatus != (int)Enums.FDStatus.Open)
                        .ToListAsync();
                    foreach (var fd in fdDetails)
                        fd.FDStatus = (int)Enums.FDStatus.Open;

                    var fdAccounts = await _context.accountmaster
                        .Where(x => fdAccountIds.Contains(x.ID) && x.IsAccClosed)
                        .ToListAsync();
                    foreach (var acc in fdAccounts)
                    {
                        acc.IsAccClosed = false;
                        acc.ClosingDate = null;
                    }
                }

                // RD mature / premature — reopen the RD account
                if (vType == (int)Enums.VoucherType.RD && isMatureOrPremature)
                {
                    var rdAccountIds = entries.Select(e => e.AccountId).Distinct().ToList();

                    var rdAccDetails = await _context.rdaccountdetail
                        .Where(x => rdAccountIds.Contains((int)x.AccId!) && x.Status != (int)Enums.FDStatus.Open)
                        .ToListAsync();
                    foreach (var rd in rdAccDetails)
                        rd.Status = (int)Enums.FDStatus.Open;

                    var rdAccounts = await _context.accountmaster
                        .Where(x => rdAccountIds.Contains(x.ID) && x.IsAccClosed)
                        .ToListAsync();
                    foreach (var acc in rdAccounts)
                    {
                        acc.IsAccClosed = false;
                        acc.ClosingDate = null;
                    }
                }

                // VoucherCreditDebitDetails has ON DELETE CASCADE — no explicit RemoveRange needed.
                _context.voucher.Remove(voucher);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return (true, "Voucher deleted successfully.");
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return (false, ex.Message ?? "An error occurred while deleting the voucher.");
            }
        }

        private static bool IsDeleteOnly(int voucherType, int voucherSubType)
        {
            if (voucherType == (int)Enums.VoucherType.FD &&
                (voucherSubType == (int)Enums.VoucherSubType.Mature ||
                 voucherSubType == (int)Enums.VoucherSubType.PreMature ||
                 voucherSubType == (int)Enums.VoucherSubType.Renew))
                return true;

            if (voucherType == (int)Enums.VoucherType.RD &&
                (voucherSubType == (int)Enums.VoucherSubType.Mature ||
                 voucherSubType == (int)Enums.VoucherSubType.PreMature))
                return true;

            if (voucherType == (int)Enums.VoucherType.Saving &&
                voucherSubType == (int)Enums.VoucherSubType.InterestPosting)
                return true;

            return false;
        }

        private static string GetVoucherTypeName(int type) => type switch
        {
            1 => "Member",
            2 => "Saving",
            3 => "Fixed Deposit",
            4 => "Recurring Deposit",
            5 => "Loan",
            6 => "Cash",
            7 => "Journal",
            _ => "Unknown"
        };

        private static string GetVoucherSubTypeName(int subType) => subType switch
        {
            1 => "Share Money",
            2 => "Deposit",
            3 => "Withdrawal",
            4 => "Interest Posting",
            5 => "Mature",
            6 => "Renew",
            7 => "Pre-Mature",
            8 => "Kist",
            9 => "Loan Advancement",
            10 => "Loan Recovery",
            11 => "Payment/Receipt",
            12 => "Transfer",
            _ => "Unknown"
        };
    }
}
