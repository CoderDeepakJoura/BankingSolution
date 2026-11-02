using BankingPlatform.API.DTO.Agent;
using BankingPlatform.API.Service.Vouchers.Loan;
using BankingPlatform.API.Service.Vouchers.RD;
using BankingPlatform.API.Service.Vouchers.Saving;
using BankingPlatform.Infrastructure.Models;

namespace BankingPlatform.API.Service.Agent
{
    public class AgentReceiptPostingService
    {
        private readonly BankingDbContext _db;
        private readonly SavingVoucherService _savingService;
        private readonly RDKistVoucherService _rdService;
        private readonly LoanRecoveryVoucherService _loanService;

        public AgentReceiptPostingService(
            BankingDbContext db,
            SavingVoucherService savingService,
            RDKistVoucherService rdService,
            LoanRecoveryVoucherService loanService)
        {
            _db = db;
            _savingService = savingService;
            _rdService = rdService;
            _loanService = loanService;
        }

        public async Task<List<UnpostedCollectionDTO>> GetUnpostedAsync(int branchId, DateTime? date, string? accType)
        {
            var query = _db.agentcollection.AsNoTracking()
                .Where(x => x.branchid == branchId && !x.isposted);

            if (date.HasValue)
                query = query.Where(x => x.collectiondate == date.Value.Date);

            if (!string.IsNullOrWhiteSpace(accType))
                query = query.Where(x => x.acctype == accType);

            var collections = await query.OrderBy(x => x.collectiondate).ThenBy(x => x.id).ToListAsync();
            if (!collections.Any()) return new();

            var agentIds = collections.Select(x => x.agentid).Distinct().ToList();
            var agents = await _db.agentmaster.AsNoTracking()
                .Where(x => agentIds.Contains(x.id))
                .ToDictionaryAsync(x => x.id, x => x.name);

            var accIds = collections.Select(x => x.accountid).Distinct().ToList();
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => accIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => new { x.AccountName, x.AccountNumber, x.AccPrefix, x.AccSuffix });

            return collections.Select(c =>
            {
                agents.TryGetValue(c.agentid, out var agentName);
                accounts.TryGetValue(c.accountid, out var acc);
                return new UnpostedCollectionDTO
                {
                    CollectionId = c.id,
                    AgentId = c.agentid,
                    AgentName = agentName ?? "",
                    AccountId = c.accountid,
                    AccountNo = BuildAccNo(acc?.AccountNumber, acc?.AccPrefix, acc?.AccSuffix),
                    AccountName = acc?.AccountName ?? "",
                    AccType = c.acctype,
                    Amount = c.amount,
                    CollectionDate = c.collectiondate,
                    Notes = c.notes
                };
            }).ToList();
        }

        public async Task<List<PostCollectionResultDTO>> BatchPostAsync(BatchPostCollectionsDTO dto)
        {
            if (!dto.CollectionIds.Any())
                return new();

            var cashAccountId = await _db.generalsettings
                .Where(x => x.branchid == dto.BranchId)
                .Select(x => x.defaultCashAccountId)
                .FirstOrDefaultAsync();

            if (cashAccountId == 0)
                return dto.CollectionIds.Select(id => new PostCollectionResultDTO
                {
                    CollectionId = id,
                    Success = false,
                    Error = "Default cash account not configured in Settings."
                }).ToList();

            var collections = await _db.agentcollection
                .Where(x => dto.CollectionIds.Contains(x.id) && x.branchid == dto.BranchId && !x.isposted)
                .ToListAsync();

            var accIds = collections.Select(x => x.accountid).Distinct().ToList();
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(x => accIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => new { x.AccountName, x.AccountNumber, x.AccPrefix, x.AccSuffix });

            var results = new List<PostCollectionResultDTO>();

            // ── Saving: all deposits in one combined voucher ──────────────────────
            var savingCols = collections.Where(x => x.acctype == "Saving").ToList();
            if (savingCols.Any())
            {
                var deposits = savingCols.Select(c => (
                    accountId: c.accountid,
                    amount: c.amount,
                    narration: dto.Narration ?? "Agent saving deposit collection"
                )).ToList();

                var (batchResult, batchVoucherNo, batchVoucherId) =
                    await _savingService.AddBatchSavingDepositVoucherAsync(
                        dto.BranchId, dto.VoucherDate, cashAccountId, deposits);

                foreach (var col in savingCols)
                {
                    accounts.TryGetValue(col.accountid, out var acc);
                    if (batchResult == "Success")
                    {
                        col.isposted = true;
                        col.voucherid = batchVoucherId;
                        results.Add(new PostCollectionResultDTO
                        {
                            CollectionId = col.id,
                            AccountNo = BuildAccNo(acc?.AccountNumber, acc?.AccPrefix, acc?.AccSuffix),
                            AccountName = acc?.AccountName ?? "",
                            Amount = col.amount,
                            Success = true,
                            VoucherNo = batchVoucherNo,
                            VoucherId = batchVoucherId
                        });
                    }
                    else
                    {
                        results.Add(new PostCollectionResultDTO
                        {
                            CollectionId = col.id,
                            AccountNo = BuildAccNo(acc?.AccountNumber, acc?.AccPrefix, acc?.AccSuffix),
                            AccountName = acc?.AccountName ?? "",
                            Amount = col.amount,
                            Success = false,
                            Error = batchResult
                        });
                    }
                }
            }

            // ── RD: all kists in one combined voucher ─────────────────────────────
            var rdCols = collections.Where(x => x.acctype == "RD").ToList();
            if (rdCols.Any())
            {
                var kists = rdCols.Select(c => (rdAccountId: c.accountid, amount: c.amount)).ToList();
                var (rdResult, rdVoucherNo, rdVoucherId) = await _rdService.AddBatchRDKistVoucherAsync(
                    dto.BranchId, dto.VoucherDate, cashAccountId, kists,
                    dto.Narration ?? "Agent RD kist collection");

                foreach (var col in rdCols)
                {
                    accounts.TryGetValue(col.accountid, out var acc);
                    if (rdResult == "Success")
                    {
                        col.isposted = true;
                        col.voucherid = rdVoucherId;
                        results.Add(new PostCollectionResultDTO
                        {
                            CollectionId = col.id,
                            AccountNo = BuildAccNo(acc?.AccountNumber, acc?.AccPrefix, acc?.AccSuffix),
                            AccountName = acc?.AccountName ?? "",
                            Amount = col.amount,
                            Success = true,
                            VoucherNo = rdVoucherNo,
                            VoucherId = rdVoucherId
                        });
                    }
                    else
                    {
                        results.Add(new PostCollectionResultDTO
                        {
                            CollectionId = col.id,
                            AccountNo = BuildAccNo(acc?.AccountNumber, acc?.AccPrefix, acc?.AccSuffix),
                            AccountName = acc?.AccountName ?? "",
                            Amount = col.amount,
                            Success = false,
                            Error = rdResult
                        });
                    }
                }
            }

            // ── Loan: all recoveries in one combined voucher ───────────────────────
            var loanCols = collections.Where(x => x.acctype == "Loan").ToList();
            if (loanCols.Any())
            {
                var recoveries = loanCols.Select(c => (loanAccountId: c.accountid, amount: c.amount)).ToList();
                var (loanResult, loanVoucherNo, loanVoucherId) = await _loanService.AddBatchLoanRecoveryVoucherAsync(
                    dto.BranchId, dto.VoucherDate, cashAccountId, recoveries,
                    dto.Narration ?? "Agent loan recovery collection");

                foreach (var col in loanCols)
                {
                    accounts.TryGetValue(col.accountid, out var acc);
                    if (loanResult == "Success")
                    {
                        col.isposted = true;
                        col.voucherid = loanVoucherId;
                        results.Add(new PostCollectionResultDTO
                        {
                            CollectionId = col.id,
                            AccountNo = BuildAccNo(acc?.AccountNumber, acc?.AccPrefix, acc?.AccSuffix),
                            AccountName = acc?.AccountName ?? "",
                            Amount = col.amount,
                            Success = true,
                            VoucherNo = loanVoucherNo,
                            VoucherId = loanVoucherId
                        });
                    }
                    else
                    {
                        results.Add(new PostCollectionResultDTO
                        {
                            CollectionId = col.id,
                            AccountNo = BuildAccNo(acc?.AccountNumber, acc?.AccPrefix, acc?.AccSuffix),
                            AccountName = acc?.AccountName ?? "",
                            Amount = col.amount,
                            Success = false,
                            Error = loanResult
                        });
                    }
                }
            }

            await _db.SaveChangesAsync();
            return results;
        }

        private static string BuildAccNo(string? accountNumber, string? prefix, int? suffix)
        {
            if (!string.IsNullOrWhiteSpace(accountNumber)) return accountNumber;
            if (!string.IsNullOrWhiteSpace(prefix) && suffix.HasValue) return $"{prefix}-{suffix}";
            return suffix?.ToString() ?? "";
        }
    }
}
