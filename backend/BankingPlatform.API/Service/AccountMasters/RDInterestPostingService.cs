using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BankingPlatform.API.Service.AccountMasters
{
    public class RDInterestKistBreakdownDTO
    {
        public int KistNo { get; set; }
        public decimal KistAmount { get; set; }
        public DateTime KistDate { get; set; }
        public DateTime EarnFrom { get; set; }
        public DateTime EarnTo { get; set; }
        public int Days { get; set; }
        public double Rate { get; set; }
        public decimal Interest { get; set; }
    }

    public class RDInterestAccountDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public int RdNumber { get; set; }
        public decimal Interest { get; set; }
        public List<RDInterestKistBreakdownDTO> Details { get; set; } = new();
    }

    public class RDInterestPostingInfoDTO
    {
        public string DebitAccountName { get; set; } = "";
        public int DebitAccountId { get; set; }
        public List<RDInterestAccountDTO> Accounts { get; set; } = new();
    }

    public class PostRDInterestDTO
    {
        public int BranchId { get; set; }
        public int ProductId { get; set; }
        public DateTime PostingDate { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<int> AccountIds { get; set; } = new();
    }

    public class RDInterestPostingService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly MemberService _memberService;
        private readonly VoucherMapper _voucherMapper;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public RDInterestPostingService(
            BankingDbContext context,
            CommonFunctions commonFunctions,
            MemberService memberService,
            VoucherMapper voucherMapper,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _commonFunctions = commonFunctions;
            _memberService = memberService;
            _voucherMapper = voucherMapper;
            _httpContextAccessor = httpContextAccessor;
        }

        // ── Get eligible accounts ─────────────────────────────────────────────

        public async Task<RDInterestPostingInfoDTO> GetEligibleAccountsAsync(
            int branchId, int productId, DateTime fromDate, DateTime toDate, int? filterAccountId = null)
        {
            var result = new RDInterestPostingInfoDTO();

            var branchWise = await _context.rdproductbranchwiserule.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BrId == branchId && x.RDProductId == productId);
            if (branchWise == null || branchWise.IntExpAccId == null || branchWise.IntExpAccId <= 0)
                return result;

            // Fetch debit account name for display
            var debitAcc = await _context.accountmaster.AsNoTracking()
                .Where(x => x.ID == branchWise.IntExpAccId && x.BranchId == branchId)
                .Select(x => new { x.AccountNumber, x.AccountName })
                .FirstOrDefaultAsync();

            result.DebitAccountId = branchWise.IntExpAccId.Value;
            result.DebitAccountName = debitAcc != null
                ? $"{debitAcc.AccountNumber} {debitAcc.AccountName}"
                : $"Account {branchWise.IntExpAccId}";

            // Get active RD accounts for this product
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId
                    && x.AccTypeId == (int)Enums.AccountTypes.RD
                    && x.GeneralProductId == productId
                    && !x.IsAccClosed
                    && (filterAccountId == null || x.ID == filterAccountId))
                .ToListAsync();

            foreach (var acc in accounts)
            {
                var rdDetail = await _context.rdaccountdetail.AsNoTracking()
                    .Where(x => x.BrId == branchId && x.AccId == acc.ID
                        && (x.Status == 1)) // Open
                    .OrderByDescending(x => x.Id)
                    .FirstOrDefaultAsync();

                if (rdDetail == null || rdDetail.InterestRate == null || rdDetail.InterestRate <= 0)
                    continue;

                // Skip if already posted for this period
                bool alreadyPosted = await _context.voucherrddetail.AsNoTracking()
                    .AnyAsync(x => x.RdAccId == acc.ID && x.BrId == branchId
                        && x.Operation == "IP"
                        && x.VoucherMainStatus != "D"
                        && x.ValueDate >= fromDate.Date && x.ValueDate <= toDate.Date);
                if (alreadyPosted) continue;

                // Get only genuine kist payments (match configured KistAmt) paid up to toDate
                var kistAmt = rdDetail.KistAmt ?? 0;
                var kists = await _context.voucherrddetail.AsNoTracking()
                    .Where(x => x.RdAccId == acc.ID && x.BrId == branchId
                        && x.Operation == "RC"
                        && x.VoucherMainStatus != "D"
                        && x.ValueDate != null && x.ValueDate.Value.Date <= toDate.Date
                        && (kistAmt == 0 || (decimal)x.AmountCr == kistAmt))
                    .Select(x => new { x.AmountCr, x.ValueDate })
                    .ToListAsync();

                if (!kists.Any()) continue;

                decimal interest = 0;
                double rate = rdDetail.InterestRate.Value;
                var breakdown = new List<RDInterestKistBreakdownDTO>();
                int kistNo = 1;

                foreach (var kist in kists.OrderBy(k => k.ValueDate))
                {
                    DateTime kistDate = kist.ValueDate!.Value.Date;
                    DateTime earnFrom = kistDate < fromDate.Date ? fromDate.Date : kistDate;
                    int days = (toDate.Date - earnFrom).Days + 1;
                    if (days <= 0) { kistNo++; continue; }
                    decimal kistInterest = Math.Round((decimal)kist.AmountCr * (decimal)rate / 100m * days / 365m, 2);
                    interest += kistInterest;
                    breakdown.Add(new RDInterestKistBreakdownDTO
                    {
                        KistNo = kistNo,
                        KistAmount = (decimal)kist.AmountCr,
                        KistDate = kistDate,
                        EarnFrom = earnFrom,
                        EarnTo = toDate.Date,
                        Days = days,
                        Rate = rate,
                        Interest = kistInterest,
                    });
                    kistNo++;
                }

                interest = Math.Round(interest, 2);
                if (interest <= 0) continue;

                result.Accounts.Add(new RDInterestAccountDTO
                {
                    AccountId = acc.ID,
                    AccountNumber = $"{acc.AccPrefix}-{acc.AccSuffix}",
                    AccountName = acc.AccountName ?? "",
                    RdNumber = rdDetail.RdNumber ?? 0,
                    Interest = interest,
                    Details = breakdown,
                });
            }

            return result;
        }

        // ── Post interest ─────────────────────────────────────────────────────

        public async Task<string> PostInterestAsync(PostRDInterestDTO dto)
        {
            var branchWise = await _context.rdproductbranchwiserule.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BrId == dto.BranchId && x.RDProductId == dto.ProductId);
            if (branchWise == null || branchWise.IntExpAccId == null || branchWise.IntExpAccId <= 0)
                return "Interest expense account is not configured in branch-wise rules.";

            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var userIdClaim = claimsPrincipal?.FindFirst("userId")?.Value
                           ?? claimsPrincipal?.FindFirst("UserId")?.Value
                           ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            int nextVrNo = await _commonFunctions.GetLatestVoucherNo(dto.BranchId, dto.PostingDate);
            bool isAutoVerification = await _commonFunctions.IsAutoVerification(dto.BranchId);
            string voucherStatus = isAutoVerification ? "V" : "A";
            DateTime voucherDate = DateTime.SpecifyKind(dto.PostingDate, DateTimeKind.Unspecified);
            DateTime valueDate = DateTime.SpecifyKind(dto.ToDate, DateTimeKind.Unspecified);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var accountId in dto.AccountIds)
                {
                    var rdDetail = await _context.rdaccountdetail
                        .Where(x => x.BrId == dto.BranchId && x.AccId == accountId && x.Status == 1)
                        .OrderByDescending(x => x.Id)
                        .FirstOrDefaultAsync();

                    if (rdDetail == null || rdDetail.InterestRate == null) continue;

                    // Recalculate interest (only genuine kist payments matching configured KistAmt)
                    var kistAmt = rdDetail.KistAmt ?? 0;
                    var kists = await _context.voucherrddetail.AsNoTracking()
                        .Where(x => x.RdAccId == accountId && x.BrId == dto.BranchId
                            && x.Operation == "RC"
                            && x.VoucherMainStatus != "D"
                            && x.ValueDate != null && x.ValueDate.Value.Date <= dto.ToDate.Date
                            && (kistAmt == 0 || (decimal)x.AmountCr == kistAmt))
                        .Select(x => new { x.AmountCr, x.ValueDate })
                        .ToListAsync();

                    if (!kists.Any()) continue;

                    decimal interest = 0;
                    double rate = rdDetail.InterestRate.Value;

                    foreach (var kist in kists)
                    {
                        DateTime kistDate = kist.ValueDate!.Value.Date;
                        DateTime earnFrom = kistDate < dto.FromDate.Date ? dto.FromDate.Date : kistDate;
                        int days = (dto.ToDate.Date - earnFrom).Days + 1;
                        if (days <= 0) continue;
                        interest += (decimal)kist.AmountCr * (decimal)rate / 100m * days / 365m;
                    }

                    interest = Math.Round(interest, 2);
                    if (interest <= 0) continue;

                    // Create voucher
                    var voucherEntity = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = voucherDate,
                        AddedBy = int.Parse(userIdClaim!),
                        BrID = dto.BranchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? int.Parse(userIdClaim!) : 0,
                        VoucherNarration = $"RD Interest Posting ({dto.FromDate:dd-MMM-yyyy} to {dto.ToDate:dd-MMM-yyyy})",
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = voucherStatus,
                        VoucherType = (int)Enums.VoucherType.RD,
                        VoucherSubType = (int)Enums.VoucherSubType.InterestPosting,
                    };

                    var voucherInfo = _memberService.MapToEntity(voucherEntity);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();

                    // Dr: Interest Expense Account
                    long expHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(branchWise.IntExpAccId.Value, dto.BranchId);
                    var drEntry = _memberService.voucherCreditDebitDetails(
                        expHeadCode, branchWise.IntExpAccId.Value, dto.BranchId,
                        Enums.VoucherStatus.Dr.ToString(),
                        $"RD Interest Expense ({dto.FromDate:dd-MMM-yyyy} to {dto.ToDate:dd-MMM-yyyy})",
                        interest, voucherStatus,
                        DateTime.SpecifyKind(dto.PostingDate, DateTimeKind.Utc),
                        "Dr", voucherInfo.Id, 1);
                    _context.vouchercreditdebitdetails.Add(drEntry);
                    await _context.SaveChangesAsync();

                    // Cr: Member's RD account
                    long rdHeadCode = await _commonFunctions.GetAccountHeadCodeFromAccId(accountId, dto.BranchId);
                    var crEntry = _memberService.voucherCreditDebitDetails(
                        rdHeadCode, accountId, dto.BranchId,
                        Enums.VoucherStatus.Cr.ToString(),
                        $"RD Interest ({dto.FromDate:dd-MMM-yyyy} to {dto.ToDate:dd-MMM-yyyy})",
                        interest, voucherStatus,
                        DateTime.SpecifyKind(dto.PostingDate, DateTimeKind.Utc),
                        "Cr", voucherInfo.Id, 2);
                    _context.vouchercreditdebitdetails.Add(crEntry);
                    await _context.SaveChangesAsync();

                    // VoucherRDDetail entry (Operation = "IP", ValueDate = toDate for tracking)
                    var rdVoucherDetail = _voucherMapper.voucherRDDetails(
                        dto.BranchId, accountId, rdDetail.Id,
                        crEntry.Id, voucherInfo.Id,
                        (double)interest, 0, "IP", voucherStatus,
                        voucherDate, valueDate);
                    await _context.voucherrddetail.AddAsync(rdVoucherDetail);
                    await _context.SaveChangesAsync();

                    nextVrNo++;
                }

                await transaction.CommitAsync();
                return "Success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"Error: {ex.Message}";
            }
        }
    }
}
