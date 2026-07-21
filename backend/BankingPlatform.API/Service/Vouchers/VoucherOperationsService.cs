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

            // ── IB voucher protection / revert logic ─────────────────────────────

            // Check if this voucher is the Step 1 of any IB record
            var ibAsStep1 = await _context.interbranchvoucher
                .FirstOrDefaultAsync(x => x.Step1VoucherId == voucher.Id);
            if (ibAsStep1 != null)
            {
                if (ibAsStep1.Step2VoucherId.HasValue)
                    return (false, "Cannot delete: this IB voucher has already been confirmed at HO (Step 2). Delete the HO settlement voucher first.");
                if (ibAsStep1.Step3VoucherId.HasValue)
                    return (false, "Cannot delete: this IB voucher has already been approved at the destination branch (Step 3). Delete the destination approval voucher first.");
            }

            // Check if this voucher is a Step 2 or Step 3 IB approval — revert the IB record after deletion
            var ibAsStep2 = await _context.interbranchvoucher
                .FirstOrDefaultAsync(x => x.Step2VoucherId == voucher.Id);
            var ibAsStep3 = await _context.interbranchvoucher
                .FirstOrDefaultAsync(x => x.Step3VoucherId == voucher.Id);

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

                // Delete StockMain and related GST records linked to this voucher (no CASCADE from voucher)
                var stockMains = await _context.stockmain
                    .Where(x => x.VmId == voucher.Id && x.BrId == branchId)
                    .ToListAsync();
                if (stockMains.Any())
                {
                    foreach (var sm in stockMains)
                    {
                        var td = await _context.stocktaxdetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                        if (td.Any()) _context.stocktaxdetail.RemoveRange(td);
                        var sd = await _context.gstservicedetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                        if (sd.Any()) _context.gstservicedetail.RemoveRange(sd);
                        var smd = await _context.smdetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                        if (smd.Any()) _context.smdetail.RemoveRange(smd);
                        var bbd = await _context.stockbillbookdetail.Where(x => x.StockMainId == sm.Id).ToListAsync();
                        if (bbd.Any()) _context.stockbillbookdetail.RemoveRange(bbd);
                    }
                    _context.stockmain.RemoveRange(stockMains);
                    await _context.SaveChangesAsync();
                }

                // VoucherCreditDebitDetails has ON DELETE CASCADE — no explicit RemoveRange needed.
                _context.voucher.Remove(voucher);

                await _context.SaveChangesAsync();

                // ── Revert IB record if this was a step 2 or step 3 approval ────
                if (ibAsStep2 != null)
                {
                    ibAsStep2.Step2VoucherId  = null;
                    ibAsStep2.Step2BrId       = null;
                    ibAsStep2.Step2DrAccId    = null;
                    ibAsStep2.Step2DrAccName  = null;
                    ibAsStep2.Step2DrHeadCode = null;
                    ibAsStep2.Step2CrAccId    = null;
                    ibAsStep2.Step2CrAccName  = null;
                    ibAsStep2.Step2CrHeadCode = null;
                    ibAsStep2.Step2Date       = null;
                    ibAsStep2.Step2WorkingDate = null;
                    ibAsStep2.Step2UserId     = null;
                    // Revert status: if Step 3 was also done, fall back to BranchCompleted, else Pending
                    ibAsStep2.Status = ibAsStep2.Step3VoucherId.HasValue ? "BranchCompleted" : "Pending";
                    await _context.SaveChangesAsync();
                }

                if (ibAsStep3 != null)
                {
                    ibAsStep3.Step3VoucherId  = null;
                    ibAsStep3.Step3BrId       = null;
                    ibAsStep3.Step3DrAccId    = null;
                    ibAsStep3.Step3DrAccName  = null;
                    ibAsStep3.Step3DrHeadCode = null;
                    ibAsStep3.Step3CrAccId    = null;
                    ibAsStep3.Step3CrAccName  = null;
                    ibAsStep3.Step3CrHeadCode = null;
                    ibAsStep3.Step3Date       = null;
                    ibAsStep3.Step3WorkingDate = null;
                    ibAsStep3.Step3UserId     = null;
                    // Revert status: if HO step was done, back to HOConfirmed, else Pending
                    ibAsStep3.Status = ibAsStep3.Step2VoucherId.HasValue ? "HOConfirmed" : "Pending";
                    await _context.SaveChangesAsync();
                }

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
            9 => "Inter Branch",
            _ => "Unknown"
        };

        private static string GetVoucherSubTypeName(int subType) => subType switch
        {
            1  => "Share Money",
            2  => "Deposit",
            3  => "Withdrawal",
            4  => "Interest Posting",
            5  => "Mature",
            6  => "Renew",
            7  => "Pre-Mature",
            8  => "Kist",
            9  => "Loan Advancement",
            10 => "Loan Recovery",
            11 => "Payment/Receipt",
            12 => "Transfer",
            19 => "IB Saving Dep — HO Step 1",
            20 => "IB Saving Dep — Branch Credit (HO→Br)",
            21 => "IB Saving Dep — Source Branch Step 1",
            22 => "IB Saving Dep — HO Settlement",
            23 => "IB Saving Dep — Dest Branch Credit",
            24 => "IB Saving Wdl — HO Step 1",
            25 => "IB Saving Wdl — Dest Branch Debit (HO→Br)",
            26 => "IB Saving Wdl — Source Branch Step 1",
            27 => "IB Saving Wdl — HO Settlement",
            28 => "IB Saving Wdl — Dest Branch Debit",
            _ => "Unknown"
        };
    }
}
