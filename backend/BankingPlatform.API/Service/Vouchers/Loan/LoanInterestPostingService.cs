using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher.Loan;
using BankingPlatform.Infrastructure.Models.AccMasters.Loan;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Vouchers.Loan
{
    public class LoanInterestPostingService
    {
        private readonly BankingDbContext _db;
        private readonly CommonFunctions _cf;
        private readonly LoanRecoveryVoucherService _recoveryService;

        private const int CAT_STD   = (int)Enums.IntCategory.StdInterest;
        private const int CAT_PENAL = (int)Enums.IntCategory.PenalInterest;

        public LoanInterestPostingService(BankingDbContext db, CommonFunctions cf, LoanRecoveryVoucherService recoveryService)
        {
            _db = db;
            _cf = cf;
            _recoveryService = recoveryService;
        }

        // ── Search ───────────────────────────────────────────────────────────────

        public async Task<List<LoanAccountSearchDTO>> SearchLoanAccountsAsync(int branchId, string query, int? productId = null)
        {
            var q = query.Trim().ToLower();
            return await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                         && x.AccTypeId == (int)Enums.AccountTypes.Loan
                         && !x.IsAccClosed
                         && (!productId.HasValue || x.GeneralProductId == productId)
                         && (x.AccountNumber.ToLower().Contains(q)
                             || (x.AccountName != null && x.AccountName.ToLower().Contains(q))))
                .OrderBy(x => x.AccountNumber)
                .Take(20)
                .Select(x => new LoanAccountSearchDTO
                {
                    AccountId     = x.ID,
                    AccountNumber = x.AccountNumber,
                    AccountName   = x.AccountName ?? "",
                    MemberId      = x.MemberId,
                })
                .ToListAsync();
        }

        // ── Postable Interest Info ────────────────────────────────────────────────

        public async Task<LoanInterestPostingInfoDTO?> GetPostableInterestAsync(int loanAccId, int branchId, DateTime? asOfDate = null)
        {
            var bal = await _recoveryService.GetLoanBalanceAsync(loanAccId, branchId, asOfDate);
            if (bal == null) return null;

            return new LoanInterestPostingInfoDTO
            {
                LoanAccId              = bal.LoanAccId,
                AccountNumber          = bal.AccountNumber,
                MemberName             = bal.MemberName,
                MemberRelativeName     = bal.MemberRelativeName,
                PhoneNo                = bal.PhoneNo,
                LoanNo                 = bal.LoanNo,
                LoanDate               = bal.LoanDate,
                StandardInterestRate   = bal.StandardInterestRate,
                OverdueInterestRate    = bal.OverdueInterestRate,
                PrincipalBalance       = bal.PrincipalBalance,
                UnpostedStdInterest    = Math.Round(bal.StdInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                UnpostedPenalInterest  = Math.Round(bal.PenalInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                TotalPostable          = Math.Round(bal.StdInterestOutstanding + bal.PenalInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                InterestCalcFromDate   = bal.InterestCalcFromDate,
                InterestCalcToDate     = bal.InterestCalcToDate,
                IntCalcMethod          = bal.IntCalcMethod,
                ActOnIntPosting        = bal.ActOnIntPosting,
            };
        }

        // ── Post Interest ─────────────────────────────────────────────────────────

        public async Task<(string result, int voucherNo)> PostInterestAsync(LoanInterestPostingVoucherDTO dto)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (dto.LoanAccountId <= 0)
                    return ("Invalid loan account.", 0);

                decimal stdAmt   = Math.Round(dto.StdInterestAmount, 0, MidpointRounding.AwayFromZero);
                decimal penalAmt = Math.Round(dto.PenalInterestAmount, 0, MidpointRounding.AwayFromZero);
                decimal total    = stdAmt + penalAmt;

                if (total <= 0)
                    return ("No interest amount to post.", 0);

                // Validate against actual unposted interest (skipped for AddInBalance — no separate interest ledger)
                var info = await GetPostableInterestAsync(dto.LoanAccountId, dto.BrId, dto.VoucherDate);
                if (info == null)
                    return ("Loan account not found.", 0);
                bool isAddInBalance = info.ActOnIntPosting == 1;
                if (!isAddInBalance)
                {
                    if (stdAmt > info.UnpostedStdInterest + 0.01m)
                        return ($"Standard interest ({stdAmt:N2}) exceeds unposted amount ({info.UnpostedStdInterest:N2}).", 0);
                    if (penalAmt > info.UnpostedPenalInterest + 0.01m)
                        return ($"Penal interest ({penalAmt:N2}) exceeds unposted amount ({info.UnpostedPenalInterest:N2}).", 0);
                }

                // ── Voucher header ────────────────────────────────────────────────
                int nextVrNo    = await _cf.GetLatestVoucherNo(dto.BrId, dto.VoucherDate);
                bool autoVerify = await _cf.IsAutoVerification(dto.BrId);
                string vrStatus = autoVerify ? "V" : "A";
                int userId      = int.Parse(_cf.GetCurrentUserId()!);
                DateTime vrDate  = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                DateTime valDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Utc);
                string narr      = string.IsNullOrWhiteSpace(dto.Narration)
                    ? $"Loan Interest Posting - {dto.VoucherDate:dd-MMM-yyyy}"
                    : dto.Narration;

                var voucher = new Voucher
                {
                    BrID             = dto.BrId,
                    VoucherNo        = nextVrNo,
                    VoucherType      = (int)Enums.VoucherType.Loan,
                    VoucherSubType   = (int)Enums.VoucherSubType.InterestPosting,
                    VoucherDate      = vrDate,
                    ActualTime       = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherNarration = narr,
                    VoucherStatus    = vrStatus,
                    AddedBy          = userId,
                    ModifiedBy       = 0,
                    VerifiedBy       = autoVerify ? userId : 0,
                    OtherBrID        = 0,
                };
                await _db.voucher.AddAsync(voucher);
                await _db.SaveChangesAsync();
                int voucherId = voucher.Id;

                // ── Resolve account heads ─────────────────────────────────────────
                long loanHead = await _cf.GetAccountHeadCodeFromAccId(dto.LoanAccountId, dto.BrId);

                var acc = await _db.accountmaster.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ID == dto.LoanAccountId && x.BranchId == dto.BrId);

                int  intIncomeAccId = 0;
                long intIncomeHead  = 0;
                if (acc?.GeneralProductId.HasValue == true)
                {
                    var rule = await _cf.GetLoanProductBranchWiseRuleInfo(dto.BrId, acc.GeneralProductId.Value);
                    if (rule.IntIncomeAcc.HasValue && rule.IntIncomeAcc.Value > 0)
                    {
                        intIncomeAccId = rule.IntIncomeAcc.Value;
                        intIncomeHead  = await _cf.GetAccountHeadCodeFromAccId(intIncomeAccId, dto.BrId);
                    }
                }

                // ── VoucherCreditDebitDetails ─────────────────────────────────────
                int row = 1;

                // Dr: Interest Income account (income recognized)
                //     Falls back to loan account if no income account configured
                int  drAccId = intIncomeAccId > 0 ? intIncomeAccId : dto.LoanAccountId;
                long drHead  = intIncomeHead  > 0 ? intIncomeHead  : loanHead;

                await _db.vouchercreditdebitdetails.AddAsync(new VoucherCreditDebitDetails
                {
                    BrId             = dto.BrId,
                    VoucherID        = voucherId,
                    AccountId        = drAccId,
                    AccHeadCode      = drHead,
                    VoucherAmount    = total,
                    VoucherEntryType = "Dr",
                    EntryStatus      = Enums.VoucherStatus.Dr.ToString(),
                    Narration        = narr,
                    VoucherStatus    = vrStatus,
                    ValueDate        = valDate,
                    VoucherSeqNo     = row,
                    IntDr = null, IntCr = null, ExpenseAmt = 0,
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                });
                row++;

                // Cr: Loan account (interest formally recognized as receivable on this loan)
                var crEntry = new VoucherCreditDebitDetails
                {
                    BrId             = dto.BrId,
                    VoucherID        = voucherId,
                    AccountId        = dto.LoanAccountId,
                    AccHeadCode      = loanHead,
                    VoucherAmount    = 0,
                    VoucherEntryType = "Cr",
                    EntryStatus      = "IP",
                    Narration        = narr,
                    VoucherStatus    = vrStatus,
                    ValueDate        = valDate,
                    VoucherSeqNo     = row,
                    IntDr            = total,
                    IntCr            = null,
                    ExpenseAmt       = 0,
                    HCL1 = 0, HCL2 = 0, HCL3 = 0,
                };
                await _db.vouchercreditdebitdetails.AddAsync(crEntry);
                await _db.SaveChangesAsync();
                int crId = crEntry.Id;

                // ── VoucherRecIntDetail — formal interest ledger entries (Stand loans only) ─
                // AddInBalance doesn't use this table — interest is embedded in principal via
                // loanaccountbalancedetail.IntDr written below.
                if (!isAddInBalance)
                {
                    if (stdAmt > 0)
                    {
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId              = dto.BrId,
                            VAccCrDrId        = crId,
                            VoucherId         = voucherId,
                            VoucherNo         = nextVrNo,
                            EntryDate         = vrDate,
                            ValueDate         = valDate,
                            IntCatId          = CAT_STD,
                            Pamt              = (double)info.PrincipalBalance,
                            AccId             = dto.LoanAccountId,
                            IntDr             = (double)stdAmt,
                            IntCr             = 0,
                            VoucherMainStatus = vrStatus,
                        });
                    }

                    if (penalAmt > 0)
                    {
                        await _db.voucherrecintdetail.AddAsync(new VoucherRecIntDetail
                        {
                            BrId              = dto.BrId,
                            VAccCrDrId        = crId,
                            VoucherId         = voucherId,
                            VoucherNo         = nextVrNo,
                            EntryDate         = vrDate,
                            ValueDate         = valDate,
                            IntCatId          = CAT_PENAL,
                            Pamt              = (double)info.PrincipalBalance,
                            AccId             = dto.LoanAccountId,
                            IntDr             = (double)penalAmt,
                            IntCr             = 0,
                            VoucherMainStatus = vrStatus,
                        });
                    }
                }

                // ── LoanAccountBalanceDetail — interest posting movement record ────
                var ob = await _db.loanaccopeningbalance.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.AccId == dto.LoanAccountId && x.BranchId == dto.BrId);

                await _db.loanaccountbalancedetail.AddAsync(new LoanAccountBalanceDetail
                {
                    BrId          = dto.BrId,
                    LoanOpenBalId = ob?.Id ?? 0,
                    AccountId     = dto.LoanAccountId,
                    AmountDr      = 0,
                    AmountCr      = 0,
                    IntDr         = total,
                    IntCr         = 0,
                    Date          = vrDate,
                    ValueDate     = valDate,
                    Status        = "IP",
                    HeadCode      = loanHead,
                    VoucherId     = voucherId,
                });

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return ("Success", nextVrNo);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return (ex.Message, 0);
            }
        }

        // ── Batch Calculate ───────────────────────────────────────────────────────

        public async Task<List<LoanInterestBatchItemDTO>> BatchCalculateInterestAsync(int brId, int productId, int? accountId, DateTime? asOfDate = null)
        {
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == brId
                         && x.GeneralProductId == productId
                         && x.AccTypeId == (int)Enums.AccountTypes.Loan
                         && !x.IsAccClosed
                         && (!accountId.HasValue || x.ID == accountId.Value))
                .OrderBy(x => x.AccountNumber)
                .Select(x => new { x.ID, x.AccountNumber })
                .ToListAsync();

            var result = new List<LoanInterestBatchItemDTO>();
            foreach (var acc in accounts)
            {
                var bal = await _recoveryService.GetLoanBalanceAsync(acc.ID, brId, asOfDate);
                if (bal == null) continue;

                decimal totalPostable = bal.StdInterestOutstanding + bal.PenalInterestOutstanding;
                string? noReason = null;

                decimal aibStdInt   = 0m;
                DateTime? aibFrom   = null;
                DateTime  aibTo     = asOfDate ?? DateTime.Today;

                if (bal.ActOnIntPosting == 1)
                {
                    // AddInBalance: GetLoanBalanceAsync returns 0 for StdInterestOutstanding because
                    // interest is embedded in principal. Compute the new accrued interest here using
                    // the same method (Schedule/Balance/MinBalance) as configured on the product.
                    DateTime? lastIpDate = await _db.loanaccountbalancedetail.AsNoTracking()
                        .Where(x => x.AccountId == acc.ID && x.BrId == brId && x.Status == "IP")
                        .OrderByDescending(x => x.Date)
                        .Select(x => (DateTime?)x.Date)
                        .FirstOrDefaultAsync();

                    aibFrom = (lastIpDate?.Date ?? bal.LoanDate) ?? aibTo;
                    int days = Math.Max(0, (aibTo - aibFrom.Value.Date).Days);

                    if (days > 0 && bal.PrincipalBalance > 0 && (bal.StandardInterestRate ?? 0) > 0)
                    {
                        decimal rate = (decimal)bal.StandardInterestRate!.Value;

                        if (bal.IntCalcMethod == "Schedule")
                        {
                            // Sum interest amounts from kist schedule entries due after the last IP date
                            var schedKists = await _db.accountkistschedule.AsNoTracking()
                                .Where(x => x.LoanAccId == acc.ID
                                         && x.Date.HasValue
                                         && x.Date.Value.Date > aibFrom.Value.Date
                                         && x.Date.Value.Date <= aibTo)
                                .ToListAsync();
                            aibStdInt = schedKists.Sum(x => x.InterestAmt ?? 0m);
                            // Fall back to Balance method when schedule has no interest entries
                            if (aibStdInt == 0)
                                aibStdInt = Math.Round(bal.PrincipalBalance * rate / 100m * days / 365m);
                        }
                        else
                        {
                            // Balance or MinBalance: use current outstanding principal
                            aibStdInt = Math.Round(bal.PrincipalBalance * rate / 100m * days / 365m);
                        }
                    }

                    totalPostable = aibStdInt;
                    if (aibStdInt == 0)
                        noReason = "No interest accrued yet";
                }
                else if (totalPostable == 0)
                {
                    if (bal.PrincipalBalance == 0)
                        noReason = "No outstanding principal — disbursement voucher may be missing";
                    else if (bal.StandardInterestRate == null || bal.StandardInterestRate == 0)
                        noReason = "Interest rate not set for this account";
                    else
                        noReason = "No interest accrued yet (loan may be too new)";
                }

                result.Add(new LoanInterestBatchItemDTO
                {
                    LoanAccId           = acc.ID,
                    AccountNumber       = acc.AccountNumber,
                    MemberName          = bal.MemberName,
                    MemberRelativeName  = bal.MemberRelativeName,
                    PrincipalBalance    = bal.PrincipalBalance,
                    StdInterest         = Math.Round(bal.ActOnIntPosting == 1 ? aibStdInt         : bal.StdInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                    PenalInterest       = Math.Round(bal.ActOnIntPosting == 1 ? 0m                : bal.PenalInterestOutstanding, 0, MidpointRounding.AwayFromZero),
                    StdRecoverable      = Math.Round(bal.ActOnIntPosting == 1 ? 0m                : bal.StdRecoverableOutstanding, 0, MidpointRounding.AwayFromZero),
                    TotalPostable       = Math.Round(totalPostable, 0, MidpointRounding.AwayFromZero),
                    CalcFromDate        = bal.ActOnIntPosting == 1 ? aibFrom           : bal.InterestCalcFromDate,
                    CalcToDate          = bal.ActOnIntPosting == 1 ? (DateTime?)aibTo  : bal.InterestCalcToDate,
                    StdInterestRate     = bal.StandardInterestRate,
                    OverdueInterestRate = bal.OverdueInterestRate,
                    IntCalcMethod       = bal.IntCalcMethod,
                    ActOnIntPosting     = bal.ActOnIntPosting,
                    NoInterestReason    = noReason,
                });
            }
            return result;
        }

        // ── Batch Post ────────────────────────────────────────────────────────────

        public async Task<LoanInterestBatchPostResultDTO> BatchPostInterestAsync(LoanInterestBatchPostRequestDTO dto)
        {
            int success = 0, fail = 0;
            var errors = new List<string>();

            foreach (var item in dto.Items)
            {
                var (result, _) = await PostInterestAsync(new LoanInterestPostingVoucherDTO
                {
                    BrId               = dto.BrId,
                    LoanAccountId      = item.LoanAccountId,
                    VoucherDate        = dto.VoucherDate,
                    StdInterestAmount  = item.StdInterestAmount,
                    PenalInterestAmount = item.PenalInterestAmount,
                    Narration          = dto.Narration,
                });

                if (result == "Success") success++;
                else { fail++; errors.Add($"Account {item.LoanAccountId}: {result}"); }
            }

            return new LoanInterestBatchPostResultDTO
            {
                SuccessCount = success,
                FailCount    = fail,
                Errors       = errors,
            };
        }
    }
}
