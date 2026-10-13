using BankingPlatform.API.Common;
using BankingPlatform.API.Service.Notifications;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.AutoDebit;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.AutoDebit
{
    public class AutoDebitService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AutoDebitService> _logger;

        public AutoDebitService(IServiceScopeFactory scopeFactory, ILogger<AutoDebitService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        /// <summary>
        /// Called by the background scheduler. Finds branches due to run and processes them.
        /// serverNow is server local time.
        /// </summary>
        public async Task RunDueBranchesAsync(DateTime serverNow)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BankingDbContext>();
            var telegram = scope.ServiceProvider.GetRequiredService<ITelegramService>();

            // Find branches with auto-debit enabled whose run time matches this minute
            var configs = await db.superusersettings
                .Where(x => x.enableAutoDebit
                         && x.autoDebitRunHour == serverNow.Hour
                         && x.autoDebitRunMinute == serverNow.Minute)
                .ToListAsync();

            foreach (var cfg in configs)
            {
                // Avoid duplicate runs: check if a run already happened today for this branch
                var today = serverNow.Date;
                bool alreadyRan = await db.autodebitrun
                    .AnyAsync(x => x.branchid == cfg.branchid && x.runDate == today && x.status != "Failed");
                if (alreadyRan) continue;

                await ProcessBranchAsync(db, telegram, cfg, today);
            }
        }

        /// <summary>
        /// Manual trigger: skips time-match and duplicate-run checks. Used by the test/run-now endpoint.
        /// </summary>
        public async Task RunBranchNowAsync(int branchId)
        {
            using var scope = _scopeFactory.CreateScope();
            var db       = scope.ServiceProvider.GetRequiredService<BankingDbContext>();
            var telegram = scope.ServiceProvider.GetRequiredService<ITelegramService>();

            var cfg = await db.superusersettings.FirstOrDefaultAsync(x => x.branchid == branchId);
            if (cfg == null) throw new InvalidOperationException($"No settings found for branch {branchId}.");

            await ProcessBranchAsync(db, telegram, cfg, DateTime.Today);
        }

        private async Task ProcessBranchAsync(
            BankingDbContext db,
            ITelegramService telegram,
            Infrastructure.Models.Settings.SuperUserSettings cfg,
            DateTime runDate)
        {
            int branchId = cfg.branchid;
            _logger.LogInformation("AutoDebit: Starting batch for branch {BranchId} on {Date}", branchId, runDate);

            var run = new AutoDebitRun
            {
                branchid      = branchId,
                runDate       = runDate,
                startTime     = DateTime.Now,
                totalAccounts = 0,
                successCount  = 0,
                failCount     = 0,
                status        = "Running",
            };
            await db.autodebitrun.AddAsync(run);
            await db.SaveChangesAsync();

            // Lookup helpers
            bool autoVerify = await db.vouchersettings
                .Where(x => x.branchid == branchId)
                .Select(x => x.autoVerification)
                .FirstOrDefaultAsync();

            // Use the first SU user for AddedBy (background has no HTTP context)
            int systemUserId = await db.user
                .Where(x => x.branchid == branchId && x.issu == 1)
                .Select(x => x.id)
                .FirstOrDefaultAsync();
            if (systemUserId == 0)
                systemUserId = await db.user
                    .Where(x => x.branchid == branchId)
                    .Select(x => x.id)
                    .FirstOrDefaultAsync();

            var details = new List<AutoDebitRunDetail>();

            // ── RD Kist ────────────────────────────────────────────────────────────
            if (cfg.autoDebitProcessRdKist)
            {
                var rdMandates = await db.autodebitaccount
                    .Where(x => x.branchid == branchId && x.accounttype == "RDKist" && x.isactive)
                    .ToListAsync();

                foreach (var mandate in rdMandates)
                {
                    var detail = await ProcessRdKistAsync(db, telegram, branchId, mandate.accountid,
                        mandate.savingaccountid ?? 0, runDate, autoVerify, systemUserId);
                    details.Add(detail);
                }
            }

            // ── Loan Recovery ──────────────────────────────────────────────────────
            if (cfg.autoDebitProcessLoanRecovery)
            {
                var loanMandates = await db.autodebitaccount
                    .Where(x => x.branchid == branchId && x.accounttype == "LoanRecovery" && x.isactive)
                    .ToListAsync();

                foreach (var mandate in loanMandates)
                {
                    var detail = await ProcessLoanRecoveryAsync(db, telegram, branchId, mandate.accountid,
                        mandate.savingaccountid ?? 0, runDate, autoVerify, systemUserId);
                    details.Add(detail);
                }
            }

            // Persist details and close the run
            foreach (var d in details)
            {
                d.runId = run.id;
                await db.autodebitrundetail.AddAsync(d);
            }

            run.endTime      = DateTime.Now;
            run.totalAccounts = details.Count;
            run.successCount  = details.Count(x => x.status == "Success");
            run.failCount     = details.Count(x => x.status == "Failed");
            run.status        = "Completed";
            await db.SaveChangesAsync();

            _logger.LogInformation("AutoDebit: Branch {BranchId} done — {S} success, {F} fail",
                branchId, run.successCount, run.failCount);

            // Telegram notification
            await SendTelegramSummaryAsync(telegram, cfg.telegramchatid, run, details);
        }

        // ────────────────────────────────────────────────────────────────────────────
        // RD Kist processor
        // ────────────────────────────────────────────────────────────────────────────
        private async Task<AutoDebitRunDetail> ProcessRdKistAsync(
            BankingDbContext db, ITelegramService telegram, int branchId, int accountId,
            int mandateSavingAccId, DateTime runDate, bool autoVerify, int addedBy)
        {
            var detail = new AutoDebitRunDetail
            {
                branchid    = branchId,
                accountid   = accountId,
                accountType = "RDKist",
            };

            try
            {
                var acc = await db.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == accountId && x.BranchId == branchId);
                if (acc == null) return Fail(detail, "Account not found.");

                detail.accountNo   = !string.IsNullOrWhiteSpace(acc.AccountNumber) ? acc.AccountNumber : $"{acc.AccPrefix}-{acc.AccSuffix}";
                detail.accountName = acc.AccountName   ?? "";

                var rdDet = await db.rdaccountdetail
                    .Where(x => x.AccId == accountId && x.BrId == branchId)
                    .OrderByDescending(x => x.Id)
                    .FirstOrDefaultAsync();

                if (rdDet == null || rdDet.KistAmt is null or 0)
                    return Fail(detail, "No active RD detail or kist amount is zero.");

                // Check if already processed today
                bool alreadyDone = await db.voucherrddetail
                    .AnyAsync(x => x.BrId == branchId && x.RdAccId == accountId
                                && x.Operation == "RC"
                                && x.VoucherDate != null && x.VoucherDate.Value.Date == runDate.Date);
                if (alreadyDone) return Skip(detail, "Already processed today.");

                decimal kistAmt = rdDet.KistAmt!.Value;
                detail.amount = kistAmt;

                // Find saving account from mandate (or fall back to member's only saving account)
                var savingAcc = mandateSavingAccId > 0
                    ? await db.accountmaster.FirstOrDefaultAsync(x => x.ID == mandateSavingAccId && x.BranchId == branchId && x.IsAccClosed != true)
                    : await db.accountmaster.FirstOrDefaultAsync(x => x.MemberId == acc.MemberId && x.BranchId == branchId
                                                                   && x.AccTypeId == (int)Enums.AccountTypes.Saving && x.IsAccClosed != true);
                if (savingAcc == null)
                    return Fail(detail, "No saving account configured for auto-debit (set one in the mandate).");

                // Check sufficient balance in saving account
                decimal savCr = await db.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == savingAcc.ID
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A") && x.VoucherEntryType == "Cr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
                decimal savDr = await db.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == savingAcc.ID
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A") && x.VoucherEntryType == "Dr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
                decimal savOb = (await db.accopeningbalance
                    .Where(x => x.BranchId == branchId && x.AccountId == savingAcc.ID)
                    .Select(x => new { x.EntryType, x.OpeningAmount })
                    .ToListAsync())
                    .Sum(x => x.EntryType == "Cr" ? x.OpeningAmount : -x.OpeningAmount);
                decimal savBalance = savCr - savDr + savOb;
                if (savBalance < kistAmt)
                    return Fail(detail, $"Insufficient saving balance (₹{savBalance:F2}) to auto-debit ₹{kistAmt:F2}.");

                // Reserve voucher number
                int voucherNo = await ReserveVoucherNoAsync(db, branchId, runDate);
                string status = autoVerify ? "V" : "A";
                var vDate = DateTime.SpecifyKind(runDate, DateTimeKind.Unspecified);
                string savAccNo = !string.IsNullOrWhiteSpace(savingAcc.AccountNumber) ? savingAcc.AccountNumber : savingAcc.ID.ToString();

                var voucher = new Voucher
                {
                    ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate      = vDate,
                    AddedBy          = addedBy,
                    BrID             = branchId,
                    ModifiedBy       = 0,
                    VerifiedBy       = autoVerify ? addedBy : 0,
                    VoucherNarration = $"Auto-Debit RD Kist - {acc.AccountName} - ₹{kistAmt:F2} (S/A: {savAccNo})",
                    OtherBrID        = 0,
                    VoucherNo        = voucherNo,
                    VoucherStatus    = status,
                    VoucherType      = (int)Enums.VoucherType.RD,
                    VoucherSubType   = (int)Enums.VoucherSubType.Kist,
                };
                await db.voucher.AddAsync(voucher);
                await db.SaveChangesAsync();

                long rdHeadCode  = acc.HeadCode;
                long savHeadCode = savingAcc.HeadCode;
                var valueDate = DateTime.SpecifyKind(runDate, DateTimeKind.Utc);

                // Cr: RD account
                var crEntry = new VoucherCreditDebitDetails
                {
                    BrId = branchId, AccountId = accountId,
                    AccHeadCode = rdHeadCode, VoucherEntryType = "Cr", EntryStatus = "Cr",
                    VoucherAmount = kistAmt, VoucherStatus = status, ValueDate = valueDate,
                    VoucherID = voucher.Id, VoucherSeqNo = 1,
                    Narration = $"RD Kist Cr - {acc.AccountName}, Amt: {kistAmt:F2}",
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await db.vouchercreditdebitdetails.AddAsync(crEntry);
                await db.SaveChangesAsync();

                // Dr: Member's saving account
                var drEntry = new VoucherCreditDebitDetails
                {
                    BrId = branchId, AccountId = savingAcc.ID,
                    AccHeadCode = savHeadCode, VoucherEntryType = "Dr", EntryStatus = "Dr",
                    VoucherAmount = kistAmt, VoucherStatus = status, ValueDate = valueDate,
                    VoucherID = voucher.Id, VoucherSeqNo = 2,
                    Narration = $"Auto-Debit Dr (S/A {savAccNo}) - {savingAcc.AccountName}, Amt: {kistAmt:F2}",
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await db.vouchercreditdebitdetails.AddAsync(drEntry);

                // VoucherRDDetail
                var rdDetail = new VoucherRDDetail
                {
                    BrId = branchId, RdAccId = accountId, RdAccDetId = rdDet.Id,
                    VaccCrDrId = crEntry.Id, VoucherId = voucher.Id,
                    AmountCr = (double)kistAmt, AmountDr = 0, Operation = "RC",
                    VoucherMainStatus = status, VoucherDate = vDate, ValueDate = valueDate,
                };
                await db.voucherrddetail.AddAsync(rdDetail);
                await db.SaveChangesAsync();

                detail.voucherId = voucher.Id;
                detail.status = "Success";

                // RD total collected so far (including this kist)
                decimal rdTotalCollected = await db.voucherrddetail
                    .Where(x => x.BrId == branchId && x.RdAccId == accountId && x.Operation == "RC")
                    .SumAsync(x => (decimal?)x.AmountCr) ?? 0;

                // Saving account balance remaining after this debit
                decimal savBalanceAfter = savBalance - kistAmt;

                // Resolve chatId synchronously before fire-and-forget (avoids concurrent DbContext use)
                string? memberChatId = null;
                if (acc.MemberId != null)
                {
                    int memBrId = acc.MemberBranchID ?? acc.BranchId;
                    memberChatId = await db.member.AsNoTracking()
                        .Where(x => x.Id == acc.MemberId.Value && x.BranchId == memBrId)
                        .Select(x => x.TelegramChatId)
                        .FirstOrDefaultAsync();
                }

                // Per-member Telegram notification (fire-and-forget — no db reference passed)
                string rdAccNo = !string.IsNullOrWhiteSpace(acc.AccountNumber) ? acc.AccountNumber : $"{acc.AccPrefix}-{acc.AccSuffix}";
                _ = SendMemberNotificationAsync(telegram, memberChatId, acc.AccountName ?? "", rdAccNo, kistAmt, "RC", runDate, rdTotalCollected, savBalanceAfter, savAccNo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AutoDebit RD Kist failed for account {AccId}", accountId);
                detail = Fail(detail, ex.Message.Length > 490 ? ex.Message[..490] : ex.Message);
            }
            return detail;
        }

        // ────────────────────────────────────────────────────────────────────────────
        // Loan Recovery processor
        // ────────────────────────────────────────────────────────────────────────────
        private async Task<AutoDebitRunDetail> ProcessLoanRecoveryAsync(
            BankingDbContext db, ITelegramService telegram, int branchId, int accountId,
            int mandateSavingAccId, DateTime runDate, bool autoVerify, int addedBy)
        {
            var detail = new AutoDebitRunDetail
            {
                branchid    = branchId,
                accountid   = accountId,
                accountType = "LoanRecovery",
            };

            try
            {
                var acc = await db.accountmaster
                    .FirstOrDefaultAsync(x => x.ID == accountId && x.BranchId == branchId);
                if (acc == null) return Fail(detail, "Account not found.");

                detail.accountNo   = !string.IsNullOrWhiteSpace(acc.AccountNumber) ? acc.AccountNumber : $"{acc.AccPrefix}-{acc.AccSuffix}";
                detail.accountName = acc.AccountName   ?? "";

                var kistDet = await db.accountkistdetail
                    .Where(x => x.AccountId == accountId && x.BrId == branchId)
                    .OrderByDescending(x => x.LoanDate)
                    .FirstOrDefaultAsync();

                if (kistDet == null || kistDet.KistAmount is null or 0)
                    return Fail(detail, "No kist detail or amount is zero.");

                // Check principal balance — skip if already cleared
                decimal crTotal = await db.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == accountId
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                             && x.VoucherEntryType == "Cr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
                decimal drTotal = await db.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == accountId
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                             && x.VoucherEntryType == "Dr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
                decimal principalBalance = drTotal - crTotal;
                if (principalBalance <= 0) return Skip(detail, "Loan fully recovered.");

                // Check if already processed today
                bool alreadyDone = await db.vouchercreditdebitdetails
                    .AnyAsync(x => x.BrId == branchId && x.AccountId == accountId
                                && x.VoucherEntryType == "Cr"
                                && x.ValueDate.Date == runDate.Date);
                if (alreadyDone) return Skip(detail, "Already processed today.");

                decimal kistAmt = Math.Min((decimal)kistDet.KistAmount!.Value, principalBalance);
                detail.amount = kistAmt;

                // Find saving account from mandate (or fall back to member's only saving account)
                var savingAccL = mandateSavingAccId > 0
                    ? await db.accountmaster.FirstOrDefaultAsync(x => x.ID == mandateSavingAccId && x.BranchId == branchId && x.IsAccClosed != true)
                    : await db.accountmaster.FirstOrDefaultAsync(x => x.MemberId == acc.MemberId && x.BranchId == branchId
                                                                   && x.AccTypeId == (int)Enums.AccountTypes.Saving && x.IsAccClosed != true);
                if (savingAccL == null)
                    return Fail(detail, "No saving account configured for auto-debit (set one in the mandate).");

                // Check sufficient balance in saving account
                decimal lSavCr = await db.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == savingAccL.ID
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A") && x.VoucherEntryType == "Cr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
                decimal lSavDr = await db.vouchercreditdebitdetails
                    .Where(x => x.BrId == branchId && x.AccountId == savingAccL.ID
                             && (x.VoucherStatus == "V" || x.VoucherStatus == "A") && x.VoucherEntryType == "Dr")
                    .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;
                decimal lSavOb = (await db.accopeningbalance
                    .Where(x => x.BranchId == branchId && x.AccountId == savingAccL.ID)
                    .Select(x => new { x.EntryType, x.OpeningAmount })
                    .ToListAsync())
                    .Sum(x => x.EntryType == "Cr" ? x.OpeningAmount : -x.OpeningAmount);
                decimal lSavBalance = lSavCr - lSavDr + lSavOb;
                if (lSavBalance < kistAmt)
                    return Fail(detail, $"Insufficient saving balance (₹{lSavBalance:F2}) to auto-debit ₹{kistAmt:F2}.");

                string lSavAccNo = !string.IsNullOrWhiteSpace(savingAccL.AccountNumber) ? savingAccL.AccountNumber : savingAccL.ID.ToString();

                int voucherNo = await ReserveVoucherNoAsync(db, branchId, runDate);
                string status = autoVerify ? "V" : "A";
                var vDate = DateTime.SpecifyKind(runDate, DateTimeKind.Unspecified);
                var valueDate = DateTime.SpecifyKind(runDate, DateTimeKind.Utc);

                long loanHeadCode = acc.HeadCode;
                long lSavHeadCode = savingAccL.HeadCode;

                var voucher = new Voucher
                {
                    ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate      = vDate,
                    AddedBy          = addedBy,
                    BrID             = branchId,
                    ModifiedBy       = 0,
                    VerifiedBy       = autoVerify ? addedBy : 0,
                    VoucherNarration = $"Auto-Debit Loan Recovery - {acc.AccountName} - ₹{kistAmt:F2} (S/A: {lSavAccNo})",
                    OtherBrID        = 0,
                    VoucherNo        = voucherNo,
                    VoucherStatus    = status,
                    VoucherType      = (int)Enums.VoucherType.Loan,
                    VoucherSubType   = (int)Enums.VoucherSubType.LoanRecovery,
                };
                await db.voucher.AddAsync(voucher);
                await db.SaveChangesAsync();

                // Cr: Loan account (recovery)
                var crEntry = new VoucherCreditDebitDetails
                {
                    BrId = branchId, AccountId = accountId,
                    AccHeadCode = loanHeadCode, VoucherEntryType = "Cr", EntryStatus = "Cr",
                    VoucherAmount = kistAmt, VoucherStatus = status, ValueDate = valueDate,
                    VoucherID = voucher.Id, VoucherSeqNo = 1,
                    Narration = $"Auto-Debit Loan Recovery Cr - {acc.AccountName}, Amt: {kistAmt:F2}",
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await db.vouchercreditdebitdetails.AddAsync(crEntry);

                // Dr: Member's saving account
                var drEntry = new VoucherCreditDebitDetails
                {
                    BrId = branchId, AccountId = savingAccL.ID,
                    AccHeadCode = lSavHeadCode, VoucherEntryType = "Dr", EntryStatus = "Dr",
                    VoucherAmount = kistAmt, VoucherStatus = status, ValueDate = valueDate,
                    VoucherID = voucher.Id, VoucherSeqNo = 2,
                    Narration = $"Auto-Debit Dr (S/A {lSavAccNo}) - {savingAccL.AccountName}, Amt: {kistAmt:F2}",
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await db.vouchercreditdebitdetails.AddAsync(drEntry);
                await db.SaveChangesAsync();

                detail.voucherId = voucher.Id;
                detail.status = "Success";

                decimal loanRemainingBalance = principalBalance - kistAmt;

                // Resolve chatId synchronously before fire-and-forget (avoids concurrent DbContext use)
                string? loanMemberChatId = null;
                if (acc.MemberId != null)
                {
                    int memBrId = acc.MemberBranchID ?? acc.BranchId;
                    loanMemberChatId = await db.member.AsNoTracking()
                        .Where(x => x.Id == acc.MemberId.Value && x.BranchId == memBrId)
                        .Select(x => x.TelegramChatId)
                        .FirstOrDefaultAsync();
                }

                // Per-member Telegram notification (fire-and-forget — no db reference passed)
                string loanAccNo = !string.IsNullOrWhiteSpace(acc.AccountNumber) ? acc.AccountNumber : $"{acc.AccPrefix}-{acc.AccSuffix}";
                decimal lSavBalanceAfter = lSavBalance - kistAmt;
                _ = SendMemberNotificationAsync(telegram, loanMemberChatId, acc.AccountName ?? "", loanAccNo, kistAmt, "LR", runDate, loanRemainingBalance, lSavBalanceAfter, lSavAccNo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AutoDebit Loan Recovery failed for account {AccId}", accountId);
                detail = Fail(detail, ex.Message.Length > 490 ? ex.Message[..490] : ex.Message);
            }
            return detail;
        }

        // ────────────────────────────────────────────────────────────────────────────
        // Helpers
        // ────────────────────────────────────────────────────────────────────────────

        // Per-branch locks to avoid concurrent voucher number collision within the auto-debit batch.
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, SemaphoreSlim> _voucherLocks = new();

        private static async Task<int> ReserveVoucherNoAsync(BankingDbContext db, int branchId, DateTime date)
        {
            var sem = _voucherLocks.GetOrAdd(branchId, _ => new SemaphoreSlim(1, 1));
            await sem.WaitAsync();
            try
            {
                int max = await db.voucher
                    .Where(x => x.BrID == branchId && x.VoucherDate.Date == date.Date)
                    .MaxAsync(x => (int?)x.VoucherNo) ?? 0;
                return max + 1;
            }
            finally
            {
                sem.Release();
            }
        }

        private static AutoDebitRunDetail Fail(AutoDebitRunDetail d, string msg)
        {
            d.status = "Failed"; d.errorMessage = msg; return d;
        }
        private static AutoDebitRunDetail Skip(AutoDebitRunDetail d, string msg)
        {
            d.status = "Skipped"; d.errorMessage = msg; return d;
        }

        private static async Task SendMemberNotificationAsync(
            ITelegramService telegram,
            string? chatId,
            string accName,
            string accNo,
            decimal amount,
            string operation,
            DateTime voucherDate,
            decimal primaryBalance,
            decimal savingBalance,
            string savAccNo = "")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(chatId)) return;

                string dateStr   = voucherDate.ToString("dd-MMM-yyyy");
                string amtStr    = amount.ToString("N2");
                string primStr   = primaryBalance.ToString("N2");
                string savStr    = savingBalance.ToString("N2");
                string savAccRef = !string.IsNullOrEmpty(savAccNo) ? savAccNo : "S/A";

                string msg = operation switch
                {
                    "RC" => $"🔁 <b>RD Kist Collected</b>\nDear {accName},\nRD kist of ₹{amtStr} has been auto-collected for A/C <b>{accNo}</b> on {dateStr}.\nRD Collected: ₹{primStr}\nSaving A/C ({savAccRef}) Balance: ₹{savStr}",
                    "LR" => $"💸 <b>Loan Auto-Recovery</b>\nDear {accName},\n₹{amtStr} has been auto-recovered from loan A/C <b>{accNo}</b> on {dateStr}.\nLoan Balance: ₹{primStr}\nSaving A/C ({savAccRef}) Balance: ₹{savStr}",
                    _    => $"📋 <b>Auto-Debit</b>\nA/C <b>{accNo}</b>: ₹{amtStr} on {dateStr}.\nBalance: ₹{primStr}"
                };

                await telegram.SendMessageAsync(chatId, msg);
            }
            catch { /* never block the caller */ }
        }

        private static async Task SendTelegramSummaryAsync(
            ITelegramService telegram, string? chatId,
            AutoDebitRun run, List<AutoDebitRunDetail> details)
        {
            if (string.IsNullOrEmpty(chatId)) return;

            var success = details.Where(x => x.status == "Success").ToList();
            var failed  = details.Where(x => x.status == "Failed").ToList();

            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"<b>Auto-Debit Run — Branch {run.branchid}</b>");
            sb.AppendLine($"Date: {run.runDate:dd-MMM-yyyy}");
            sb.AppendLine($"Total: {run.totalAccounts} | ✅ {run.successCount} | ❌ {run.failCount}");

            if (success.Any())
            {
                sb.AppendLine("\n<b>Processed:</b>");
                foreach (var d in success)
                    sb.AppendLine($"  • {d.accountName} ({d.accountType}) — ₹{d.amount:F2}");
            }
            if (failed.Any())
            {
                sb.AppendLine("\n<b>Failed:</b>");
                foreach (var d in failed)
                    sb.AppendLine($"  • {d.accountName} — {d.errorMessage}");
            }

            await telegram.SendMessageAsync(chatId, sb.ToString());
        }
    }
}
