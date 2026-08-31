using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.BankFD;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BankingPlatform.API.Controllers.BankFD
{
    // ──────────────────────────── DTOs ────────────────────────────

    public class BankFDDetailItemDTO
    {
        public int Id { get; set; }
        public string LTDNo { get; set; } = "";
        public DateTime FDDate { get; set; }
        public decimal FDAmount { get; set; }
        public int FDPeriodMonths { get; set; }
        public int FDPeriodDays { get; set; }
        public double IntRate { get; set; }
        public int IntCompInterval { get; set; } = 1;
        public DateTime FDMaturityDate { get; set; }
        public decimal MaturityAmount { get; set; }
        public int FDStatus { get; set; } = 1;
        public decimal? SerialNo { get; set; }
        // Opening balance (only for opening entry)
        public decimal OpeningBalance { get; set; }
        public string OpeningBalanceType { get; set; } = "Cr";
        public long? OpeningBalanceHeadCode { get; set; }
        // Opening TDS (only for opening entry)
        public decimal OpeningTDS { get; set; }
        public long? OpeningTDSHeadCode { get; set; }
    }

    public class CreateBankFDAccountDTO
    {
        public int AccountId { get; set; }
        public int BranchId { get; set; }
        public string AccountName { get; set; } = "";
        public string AccPrefix { get; set; } = "BFD";
        public int? AccSuffix { get; set; }   // null = auto-assign
        public DateTime OpeningDate { get; set; }
        public bool IsOpeningEntry { get; set; }
        public int HeadId { get; set; }
        public List<BankFDDetailItemDTO> Details { get; set; } = new();
        // Voucher — only for non-opening entries
        public int CreditAccountId { get; set; }
        public string VoucherNarration { get; set; } = "";
        public DateTime VoucherDate { get; set; }
    }

    // ──────────────────────────── Controller ────────────────────────────

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BankFDAccountController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly ILogger<BankFDAccountController> _logger;
        private readonly CommonFunctions _commonFunctions;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public BankFDAccountController(BankingDbContext context, ILogger<BankFDAccountController> logger, CommonFunctions commonFunctions, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _logger = logger;
            _commonFunctions = commonFunctions;
            _httpContextAccessor = httpContextAccessor;
        }

        // GET /api/BankFDAccount/last-suffix?branchId=X
        [HttpGet("last-suffix")]
        public async Task<IActionResult> GetLastSuffix([FromQuery] int branchId)
        {
            var last = await _context.accountmaster
                .Where(x => x.BranchId == branchId && x.AccTypeId == 8)
                .MaxAsync(x => (int?)x.AccSuffix) ?? 0;
            return Ok(new { Success = true, data = new { lastSuffix = last, lastAccNo = last > 0 ? $"BFD-{last}" : "None" } });
        }

        // GET /api/BankFDAccount/check-suffix?branchId=X&suffix=Y&headId=H&excludeAccId=Z
        [HttpGet("check-suffix")]
        public async Task<IActionResult> CheckSuffix([FromQuery] int branchId, [FromQuery] int suffix, [FromQuery] int? headId = null, [FromQuery] int? excludeAccId = null)
        {
            var query = _context.accountmaster
                .Where(x => x.BranchId == branchId && x.AccTypeId == 8 && x.AccSuffix == suffix);
            if (headId.HasValue && headId.Value > 0)
                query = query.Where(x => x.HeadId == headId.Value);
            if (excludeAccId.HasValue)
                query = query.Where(x => x.ID != excludeAccId.Value);
            var exists = await query.AnyAsync();
            return Ok(new { Success = true, data = new { taken = exists } });
        }

        // GET /api/BankFDAccount/{branchId}
        [HttpGet("{branchId}")]
        public async Task<IActionResult> GetAll(int branchId)
        {
            try
            {
                var accounts = await _context.accountmaster
                    .AsNoTracking()
                    .Where(a => a.BranchId == branchId && a.AccTypeId == 8)
                    .ToListAsync();

                var accIds = accounts.Select(a => a.ID).ToList();

                var detailGroups = await _context.bankfdaccountdetail
                    .AsNoTracking()
                    .Where(d => d.BrId == branchId && accIds.Contains(d.AccId))
                    .GroupBy(d => d.AccId)
                    .Select(g => new
                    {
                        AccId = g.Key,
                        DetailCount = g.Count(),
                        TotalFDAmount = g.Sum(x => x.FDAmount)
                    })
                    .ToListAsync();

                var result = accounts.Select(a =>
                {
                    var grp = detailGroups.FirstOrDefault(g => g.AccId == a.ID);
                    return new
                    {
                        accId = a.ID,
                        accountName = a.AccountName ?? "",
                        accNo = $"{a.AccPrefix ?? "BFD"}-{a.AccSuffix}",
                        openingDate = a.AccOpeningDate,
                        detailCount = grp?.DetailCount ?? 0,
                        totalFDAmount = grp?.TotalFDAmount ?? 0m
                    };
                });

                return Ok(new { Success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAll BankFDAccount error");
                await _commonFunctions.LogErrors(ex, nameof(GetAll), nameof(BankFDAccountController));
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // GET /api/BankFDAccount/{branchId}/{accId}
        [HttpGet("{branchId}/{accId}")]
        public async Task<IActionResult> GetById(int branchId, int accId)
        {
            try
            {
                var account = await _context.accountmaster
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.ID == accId && a.BranchId == branchId && a.AccTypeId == 8);

                if (account == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Account not found." });

                var details = await _context.bankfdaccountdetail
                    .AsNoTracking()
                    .Where(d => d.AccId == accId && d.BrId == branchId)
                    .ToListAsync();

                var detailIds = details.Select(d => d.ID).ToList();

                var openingBalances = await _context.bankfdaccountopeningbalance
                    .AsNoTracking()
                    .Where(ob => ob.AccountId == accId && ob.BranchID == branchId && detailIds.Contains(ob.FDAccDetId))
                    .ToListAsync();

                var openingTDSList = await _context.bankfdaccountopeningtds
                    .AsNoTracking()
                    .Where(ot => ot.AccountId == accId && ot.BranchID == branchId && detailIds.Contains(ot.FDAccDetId))
                    .ToListAsync();

                var detailResult = details.Select(d =>
                {
                    var ob = openingBalances.FirstOrDefault(x => x.FDAccDetId == d.ID);
                    var ot = openingTDSList.FirstOrDefault(x => x.FDAccDetId == d.ID);
                    return new
                    {
                        id = d.ID,
                        brId = d.BrId,
                        accId = d.AccId,
                        ltdNo = d.LTDNo,
                        fdDate = d.FDDate,
                        fdAmount = d.FDAmount,
                        fdPeriodMonths = d.FDPeriodMonths,
                        fdPeriodDays = d.FDPeriodDays,
                        intRate = d.IntRate,
                        intCompInterval = d.IntCompInterval,
                        fdMaturityDate = d.FDMaturityDate,
                        maturityAmount = d.MaturityAmount,
                        fdStatus = d.FDStatus,
                        serialNo = d.SerialNo,
                        openingBalance = ob != null ? new
                        {
                            id = ob.ID,
                            balance = ob.Balance,
                            balanceType = ob.BalanceType,
                            headCode = ob.HeadCode
                        } : null,
                        openingTDS = ot != null ? new
                        {
                            id = ot.ID,
                            balance = ot.Balance,
                            headCode = ot.HeadCode
                        } : null
                    };
                });

                var data = new
                {
                    account = new
                    {
                        accId = account.ID,
                        accountName = account.AccountName ?? "",
                        accPrefix = account.AccPrefix ?? "BFD",
                        accSuffix = account.AccSuffix,
                        accNo = $"{account.AccPrefix ?? "BFD"}-{account.AccSuffix}",
                        openingDate = account.AccOpeningDate,
                        headId = account.HeadId
                    },
                    details = detailResult
                };

                return Ok(new { Success = true, data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetById BankFDAccount error");
                await _commonFunctions.LogErrors(ex, nameof(GetById), nameof(BankFDAccountController));
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // POST /api/BankFDAccount
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBankFDAccountDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.AccountName))
                return BadRequest(new ResponseDto { Success = false, Message = "Account Name is required." });
            if (dto.Details == null || dto.Details.Count == 0)
                return BadRequest(new ResponseDto { Success = false, Message = "At least one FD detail is required." });
            if (!dto.IsOpeningEntry && dto.CreditAccountId <= 0)
                return BadRequest(new ResponseDto { Success = false, Message = "Credit account is required." });

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var prefix = string.IsNullOrWhiteSpace(dto.AccPrefix) ? "BFD" : dto.AccPrefix.Trim();

                int nextSuffix;
                if (dto.AccSuffix.HasValue && dto.AccSuffix.Value > 0)
                {
                    // Manual suffix — check uniqueness per head
                    bool taken = await _context.accountmaster
                        .AnyAsync(x => x.BranchId == dto.BranchId && x.AccTypeId == 8
                            && x.AccSuffix == dto.AccSuffix.Value
                            && (dto.HeadId == 0 || x.HeadId == dto.HeadId));
                    if (taken)
                        return BadRequest(new ResponseDto { Success = false, Message = $"Account number {prefix}-{dto.AccSuffix.Value} is already in use under this account head. Please choose a different number." });
                    nextSuffix = dto.AccSuffix.Value;
                }
                else
                {
                    var maxSuffix = await _context.accountmaster
                        .Where(x => x.BranchId == dto.BranchId && x.AccTypeId == 8)
                        .MaxAsync(x => (int?)x.AccSuffix) ?? 0;
                    nextSuffix = maxSuffix + 1;
                }

                long actualHeadCode = await _context.accounthead
                    .Where(x => x.id == dto.HeadId && x.branchid == dto.BranchId)
                    .Select(x => x.headcode)
                    .FirstOrDefaultAsync();

                var newAccount = new AccountMaster
                {
                    BranchId = dto.BranchId,
                    AccTypeId = 8,
                    AccountName = dto.AccountName.Trim(),
                    AccPrefix = prefix,
                    AccSuffix = nextSuffix,
                    AccountNumber = $"{prefix}-{nextSuffix}",
                    AccOpeningDate = DateTime.SpecifyKind(dto.OpeningDate, DateTimeKind.Unspecified),
                    IsAccClosed = false,
                    IsAccAddedManually = 0,
                    GeneralProductId = 0,
                    HeadId = dto.HeadId,
                    HeadCode = actualHeadCode,
                    MemberId = null,
                    MemberBranchID = null
                };

                await _context.accountmaster.AddAsync(newAccount);
                await _context.SaveChangesAsync();

                await SaveDetails(dto.BranchId, newAccount.ID, dto.Details, dto.IsOpeningEntry);

                int voucherNo = 0;
                if (!dto.IsOpeningEntry)
                {
                    var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
                    var userIdStr = claimsPrincipal?.FindFirst("userId")?.Value
                                 ?? claimsPrincipal?.FindFirst("UserId")?.Value
                                 ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    int userId = int.TryParse(userIdStr, out var uid) ? uid : 0;

                    bool autoVerify = await _commonFunctions.IsAutoVerification(dto.BranchId);
                    string voucherStatus = autoVerify ? "V" : "A";
                    DateTime vDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                    voucherNo = await _commonFunctions.GetLatestVoucherNo(dto.BranchId, dto.VoucherDate);
                    decimal totalAmount = dto.Details.Sum(d => d.FDAmount);

                    string narration = string.IsNullOrWhiteSpace(dto.VoucherNarration)
                        ? $"Bank FD Deposit — {newAccount.AccountName} — {newAccount.AccountNumber}"
                        : dto.VoucherNarration;

                    var voucher = new Voucher
                    {
                        BrID = dto.BranchId,
                        VoucherNo = voucherNo,
                        VoucherType = (int)Enums.VoucherType.BankFD,
                        VoucherSubType = (int)Enums.VoucherSubType.BankFDDeposit,
                        VoucherDate = vDate,
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherNarration = narration,
                        VoucherStatus = voucherStatus,
                        AddedBy = userId,
                        ModifiedBy = 0,
                        VerifiedBy = autoVerify ? userId : 0,
                        OtherBrID = 0
                    };
                    await _context.voucher.AddAsync(voucher);
                    await _context.SaveChangesAsync();

                    int seq = 1;
                    long bfdHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(newAccount.ID, dto.BranchId);

                    // Dr: Bank FD Account (asset increases — money placed in bank FD)
                    var drEntry = MakeEntry(bfdHeadCode, newAccount.ID, dto.BranchId, "Dr", narration, totalAmount, voucherStatus, vDate, voucher.Id, seq++);
                    _context.vouchercreditdebitdetails.Add(drEntry);
                    await _context.SaveChangesAsync();

                    // Cr: User-selected credit GL account (cash/funds going to bank)
                    long crHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(dto.CreditAccountId, dto.BranchId);
                    var crEntry = MakeEntry(crHeadCode, dto.CreditAccountId, dto.BranchId, "Cr", narration, totalAmount, voucherStatus, vDate, voucher.Id, seq++);
                    _context.vouchercreditdebitdetails.Add(crEntry);

                    // VoucherBFDDetail: one row per FD detail (operation = "BD" Bank Deposit)
                    var savedDetails = await _context.bankfdaccountdetail
                        .Where(d => d.BrId == dto.BranchId && d.AccId == newAccount.ID)
                        .ToListAsync();

                    foreach (var fd in savedDetails)
                    {
                        await _context.voucherbfddetail.AddAsync(new VoucherBFDDetail
                        {
                            BrId = dto.BranchId,
                            VoucherId = voucher.Id,
                            VAccCrDrId = drEntry.Id,
                            FDAccId = newAccount.ID,
                            FDAccDetId = fd.ID,
                            AmountCr = 0,
                            AmountDr = fd.FDAmount,
                            Operation = "BD",
                            ValueDate = vDate,
                            VoucherDate = vDate,
                            VoucherMainStatus = voucherStatus
                        });
                    }
                    await _context.SaveChangesAsync();
                }

                await tx.CommitAsync();
                string successMsg = voucherNo > 0
                    ? $"Voucher saved successfully with voucher no. {voucherNo}"
                    : "Bank FD account created successfully.";
                return Ok(new ResponseDto { Success = true, Message = successMsg });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Create BankFDAccount error");
                await _commonFunctions.LogErrors(ex, nameof(Create), nameof(BankFDAccountController));
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // PUT /api/BankFDAccount/{accId}
        [HttpPut("{accId}")]
        public async Task<IActionResult> Update(int accId, [FromBody] CreateBankFDAccountDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.AccountName))
                return BadRequest(new ResponseDto { Success = false, Message = "Account Name is required." });
            if (dto.Details == null || dto.Details.Count == 0)
                return BadRequest(new ResponseDto { Success = false, Message = "At least one FD detail is required." });

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var account = await _context.accountmaster
                    .FirstOrDefaultAsync(a => a.ID == accId && a.BranchId == dto.BranchId && a.AccTypeId == 8);
                if (account == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Account not found." });

                account.AccountName = dto.AccountName.Trim();
                var updPrefix = string.IsNullOrWhiteSpace(dto.AccPrefix) ? "BFD" : dto.AccPrefix.Trim();
                account.AccPrefix = updPrefix;
                account.AccOpeningDate = DateTime.SpecifyKind(dto.OpeningDate, DateTimeKind.Unspecified);
                account.HeadId = dto.HeadId;
                account.HeadCode = await _context.accounthead
                    .Where(x => x.id == dto.HeadId && x.branchid == dto.BranchId)
                    .Select(x => x.headcode)
                    .FirstOrDefaultAsync();

                if (dto.AccSuffix.HasValue && dto.AccSuffix.Value > 0 && dto.AccSuffix.Value != account.AccSuffix)
                {
                    bool taken = await _context.accountmaster
                        .AnyAsync(x => x.BranchId == dto.BranchId && x.AccTypeId == 8
                            && x.AccSuffix == dto.AccSuffix.Value
                            && x.ID != accId
                            && (dto.HeadId == 0 || x.HeadId == dto.HeadId));
                    if (taken)
                        return BadRequest(new ResponseDto { Success = false, Message = $"Account number {updPrefix}-{dto.AccSuffix.Value} is already in use under this account head. Please choose a different number." });
                    account.AccSuffix = dto.AccSuffix.Value;
                    account.AccountNumber = $"{updPrefix}-{dto.AccSuffix.Value}";
                }

                // Delete existing details (and their opening balance/TDS rows first)
                await DeleteDetailsForAccount(dto.BranchId, accId);

                await SaveDetails(dto.BranchId, accId, dto.Details, dto.IsOpeningEntry);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return Ok(new ResponseDto { Success = true, Message = "Bank FD account updated successfully." });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Update BankFDAccount error");
                await _commonFunctions.LogErrors(ex, nameof(Update), nameof(BankFDAccountController));
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // DELETE /api/BankFDAccount/{branchId}/{accId}
        [HttpDelete("{branchId}/{accId}")]
        public async Task<IActionResult> Delete(int branchId, int accId)
        {
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var account = await _context.accountmaster
                    .FirstOrDefaultAsync(a => a.ID == accId && a.BranchId == branchId && a.AccTypeId == 8);
                if (account == null)
                    return NotFound(new ResponseDto { Success = false, Message = "Account not found." });

                await DeleteDetailsForAccount(branchId, accId);

                _context.accountmaster.Remove(account);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return Ok(new ResponseDto { Success = true, Message = "Bank FD account deleted successfully." });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Delete BankFDAccount error");
                await _commonFunctions.LogErrors(ex, nameof(Delete), nameof(BankFDAccountController));
                return StatusCode(500, new ResponseDto { Success = false, Message = ex.Message });
            }
        }

        // ─── Helpers ───

        private async Task SaveDetails(int branchId, int accountId, List<BankFDDetailItemDTO> details, bool isOpeningEntry)
        {
            foreach (var d in details)
            {
                var detail = new BankFDAccountDetail
                {
                    BrId = branchId,
                    AccId = accountId,
                    LTDNo = d.LTDNo ?? "",
                    FDDate = DateTime.SpecifyKind(d.FDDate, DateTimeKind.Unspecified),
                    FDAmount = d.FDAmount,
                    FDPeriodMonths = d.FDPeriodMonths,
                    FDPeriodDays = d.FDPeriodDays,
                    IntRate = d.IntRate,
                    IntCompInterval = d.IntCompInterval,
                    FDMaturityDate = DateTime.SpecifyKind(d.FDMaturityDate, DateTimeKind.Unspecified),
                    MaturityAmount = d.MaturityAmount,
                    FDStatus = d.FDStatus,
                    SerialNo = d.SerialNo
                };

                await _context.bankfdaccountdetail.AddAsync(detail);
                await _context.SaveChangesAsync(); // flush to get detail.ID

                if (isOpeningEntry && d.OpeningBalance > 0)
                {
                    var ob = new BankFDAccountOpeningBalance
                    {
                        BranchID = branchId,
                        AccountId = accountId,
                        FDAccDetId = detail.ID,
                        Balance = d.OpeningBalance,
                        BalanceType = string.IsNullOrWhiteSpace(d.OpeningBalanceType) ? "Cr" : d.OpeningBalanceType,
                        HeadCode = d.OpeningBalanceHeadCode
                    };
                    await _context.bankfdaccountopeningbalance.AddAsync(ob);
                }

                if (isOpeningEntry && d.OpeningTDS > 0)
                {
                    var tds = new BankFDAccountOpeningTDS
                    {
                        BranchID = branchId,
                        AccountId = accountId,
                        FDAccDetId = detail.ID,
                        Balance = d.OpeningTDS,
                        HeadCode = d.OpeningTDSHeadCode
                    };
                    await _context.bankfdaccountopeningtds.AddAsync(tds);
                }
            }

            await _context.SaveChangesAsync();
        }

        private static VoucherCreditDebitDetails MakeEntry(
            long headCode, int accId, int branchId,
            string entryType, string narration, decimal amount,
            string voucherStatus, DateTime valueDate, int voucherId, int seq) => new VoucherCreditDebitDetails
        {
            AccHeadCode = headCode,
            AccountId = accId,
            BrId = branchId,
            EntryStatus = entryType,
            Narration = narration,
            VoucherAmount = amount,
            VoucherStatus = voucherStatus,
            ValueDate = valueDate,
            VoucherEntryType = entryType,
            VoucherID = voucherId,
            VoucherSeqNo = seq,
            ExpenseAmt = 0,
            HCL1 = 0, HCL2 = 0, HCL3 = 0
        };

        private async Task DeleteDetailsForAccount(int branchId, int accountId)
        {
            var detailIds = await _context.bankfdaccountdetail
                .Where(d => d.BrId == branchId && d.AccId == accountId)
                .Select(d => d.ID)
                .ToListAsync();

            if (detailIds.Count > 0)
            {
                var tdsRows = _context.bankfdaccountopeningtds
                    .Where(t => t.BranchID == branchId && t.AccountId == accountId && detailIds.Contains(t.FDAccDetId));
                _context.bankfdaccountopeningtds.RemoveRange(tdsRows);

                var obRows = _context.bankfdaccountopeningbalance
                    .Where(ob => ob.BranchID == branchId && ob.AccountId == accountId && detailIds.Contains(ob.FDAccDetId));
                _context.bankfdaccountopeningbalance.RemoveRange(obRows);

                var detailRows = _context.bankfdaccountdetail
                    .Where(d => d.BrId == branchId && d.AccId == accountId);
                _context.bankfdaccountdetail.RemoveRange(detailRows);

                await _context.SaveChangesAsync();
            }
        }
    }
}
