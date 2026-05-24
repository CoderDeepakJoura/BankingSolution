using BankingPlatform.Infrastructure.Models.NPA;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ──────────────────────────────────────────────────────────────────────

    public class NpaLedgerPlanItemDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
    }

    public class NpaLedgerCategoryItemDTO
    {
        public int Id { get; set; }
        public string Description { get; set; } = "";
        public int? PeriodFrom { get; set; }
        public int? PeriodTo { get; set; }
        public int? SeqNo { get; set; }
        public bool IsGroup { get; set; }
    }

    public class NpaLedgerRequestDTO
    {
        public int BranchId { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int PlanId { get; set; }
        public List<int> CategoryIds { get; set; } = new();
    }

    public class NpaLedgerRowDTO
    {
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string MemberName { get; set; } = "";
        public string LoanProductName { get; set; } = "";
        public DateTime? LoanDate { get; set; }
        public decimal LoanAmount { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal LoanAdvanced { get; set; }
        public decimal Repaid { get; set; }
        public decimal ClosingBalance { get; set; }
        public decimal NpaAmount { get; set; }
        public int DaysOverdue { get; set; }
        public int OverdueInstallments { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = "";
    }

    public class NpaLedgerDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string PlanName { get; set; } = "";
        public List<NpaLedgerRowDTO> Rows { get; set; } = new();
        public decimal TotalOpeningBalance { get; set; }
        public decimal TotalLoanAdvanced { get; set; }
        public decimal TotalRepaid { get; set; }
        public decimal TotalClosingBalance { get; set; }
        public decimal TotalNpa { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class NpaLedgerService
    {
        private readonly BankingDbContext _db;
        public NpaLedgerService(BankingDbContext db) => _db = db;

        public async Task<List<NpaLedgerPlanItemDTO>> GetPlansAsync(int branchId)
        {
            return await _db.npaplanmaster.AsNoTracking()
                .Where(p => p.BrId == branchId)
                .OrderBy(p => p.Code)
                .Select(p => new NpaLedgerPlanItemDTO { Id = p.Id, Name = p.Description ?? p.Code })
                .ToListAsync();
        }

        public async Task<List<NpaLedgerCategoryItemDTO>> GetCategoriesAsync(int branchId, int planId)
        {
            return await _db.npaplancategory.AsNoTracking()
                .Where(c => c.BrId == branchId && c.PlanId == planId)
                .OrderBy(c => c.SeqNo ?? 999)
                .Select(c => new NpaLedgerCategoryItemDTO
                {
                    Id = c.Id,
                    Description = c.Description ?? "",
                    PeriodFrom = c.PeriodFrom,
                    PeriodTo = c.PeriodTo,
                    SeqNo = c.SeqNo,
                    IsGroup = c.IsGroup == "Y",
                })
                .ToListAsync();
        }

        public async Task<NpaLedgerDTO> GetNpaLedgerAsync(NpaLedgerRequestDTO req)
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == req.BranchId);

            var plan = await _db.npaplanmaster.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == req.PlanId && p.BrId == req.BranchId);

            var emptyResult = new NpaLedgerDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate      = req.FromDate,
                ToDate        = req.ToDate,
                PlanName      = plan != null ? (plan.Description ?? plan.Code) : "",
            };

            if (plan == null) return emptyResult;

            // All leaf categories for this plan
            var allCategories = await _db.npaplancategory.AsNoTracking()
                .Where(c => c.BrId == req.BranchId && c.PlanId == req.PlanId && c.IsGroup != "Y")
                .OrderBy(c => c.SeqNo ?? 999)
                .ToListAsync();

            // Loan products linked to this NPA plan
            var linkedProductIds = await _db.loanproductbranchwiserule.AsNoTracking()
                .Where(r => r.BranchId == req.BranchId && r.NPAPlanId == req.PlanId)
                .Select(r => r.LoanProductId)
                .ToListAsync();

            if (!linkedProductIds.Any()) return emptyResult;

            var productNames = await _db.loanproduct.AsNoTracking()
                .Where(p => linkedProductIds.Contains(p.Id) && p.BrId == req.BranchId)
                .ToDictionaryAsync(p => p.Id, p => p.ProductName);

            // Active loan accounts for those products
            var loanAccounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == req.BranchId
                    && a.AccTypeId == 1
                    && a.GeneralProductId.HasValue
                    && linkedProductIds.Contains(a.GeneralProductId.Value)
                    && !a.IsAccClosed)
                .Select(a => new { a.ID, a.AccountNumber, a.AccountName, a.MemberId, a.GeneralProductId })
                .ToListAsync();

            if (!loanAccounts.Any()) return emptyResult;

            var accountIds = loanAccounts.Select(a => a.ID).ToList();

            // Member names
            var memberIds = loanAccounts.Where(a => a.MemberId.HasValue)
                .Select(a => a.MemberId!.Value).Distinct().ToList();
            var memberNameMap = await _db.member.AsNoTracking()
                .Where(m => memberIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Id, m => m.MemberName);

            // Initial opening balance records
            var obMap = await _db.loanaccopeningbalance.AsNoTracking()
                .Where(ob => ob.BranchId == req.BranchId && ob.AccId.HasValue && accountIds.Contains(ob.AccId.Value))
                .ToDictionaryAsync(ob => ob.AccId!.Value, ob => ob);

            // Kist details (loan terms)
            var kistDetailMap = await _db.accountkistdetail.AsNoTracking()
                .Where(k => k.BrId == req.BranchId && accountIds.Contains(k.AccountId))
                .ToDictionaryAsync(k => k.AccountId, k => k);

            var fromDay        = req.FromDate.Date;
            var toNextDay      = req.ToDate.Date.AddDays(1);

            // Voucher entries BEFORE FromDate (for opening balance)
            var beforeEntries = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == req.BranchId
                    && accountIds.Contains(v.AccountId)
                    && v.ValueDate < fromDay)
                .GroupBy(v => new { v.AccountId, v.VoucherEntryType })
                .Select(g => new { g.Key.AccountId, g.Key.VoucherEntryType, Total = g.Sum(v => v.VoucherAmount) })
                .ToListAsync();

            var drBeforeMap = beforeEntries.Where(e => e.VoucherEntryType == "Dr")
                .ToDictionary(e => e.AccountId, e => e.Total);
            var crBeforeMap = beforeEntries.Where(e => e.VoucherEntryType == "Cr")
                .ToDictionary(e => e.AccountId, e => e.Total);

            // Voucher entries IN period
            var periodEntries = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == req.BranchId
                    && accountIds.Contains(v.AccountId)
                    && v.ValueDate >= fromDay
                    && v.ValueDate < toNextDay)
                .GroupBy(v => new { v.AccountId, v.VoucherEntryType })
                .Select(g => new { g.Key.AccountId, g.Key.VoucherEntryType, Total = g.Sum(v => v.VoucherAmount) })
                .ToListAsync();

            var drPeriodMap = periodEntries.Where(e => e.VoucherEntryType == "Dr")
                .ToDictionary(e => e.AccountId, e => e.Total);
            var crPeriodMap = periodEntries.Where(e => e.VoucherEntryType == "Cr")
                .ToDictionary(e => e.AccountId, e => e.Total);

            // All Cr entries up to ToDate (for NPA / overdue calculation)
            var totalCrToToDateMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => v.BrId == req.BranchId
                    && accountIds.Contains(v.AccountId)
                    && v.VoucherEntryType == "Cr"
                    && v.ValueDate < toNextDay)
                .GroupBy(v => v.AccountId)
                .Select(g => new { AccountId = g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToDictionaryAsync(e => e.AccountId, e => e.Total);

            // Kist schedules
            var rawKists = await _db.accountkistschedule.AsNoTracking()
                .Where(k => k.BrId == req.BranchId
                    && k.LoanAccId.HasValue
                    && accountIds.Contains(k.LoanAccId.Value)
                    && k.Date.HasValue)
                .Select(k => new { k.LoanAccId, k.Date, KistAmt = k.KistAmount ?? 0m })
                .ToListAsync();

            var kistByAccount = rawKists
                .GroupBy(k => k.LoanAccId!.Value)
                .ToDictionary(g => g.Key, g => g.OrderBy(k => k.Date).ToList());

            bool useInstallments = plan.OvrDuePeriodOrInst == 2;
            bool fromLoanDate    = plan.CalNPAFromLoanDate == 1;

            var rows = new List<NpaLedgerRowDTO>();

            foreach (var acc in loanAccounts)
            {
                var ob = obMap.GetValueOrDefault(acc.ID);
                decimal initialOb = ob == null ? 0m
                    : (ob.BalType?.ToUpper() == "DR" ? (ob.TotalBalance ?? 0m) : -(ob.TotalBalance ?? 0m));

                decimal drBefore = drBeforeMap.GetValueOrDefault(acc.ID);
                decimal crBefore = crBeforeMap.GetValueOrDefault(acc.ID);
                decimal openingBalance = initialOb + drBefore - crBefore;

                decimal loanAdvanced = drPeriodMap.GetValueOrDefault(acc.ID);
                decimal repaid       = crPeriodMap.GetValueOrDefault(acc.ID);
                decimal closingBalance = openingBalance + loanAdvanced - repaid;

                if (openingBalance == 0 && loanAdvanced == 0 && repaid == 0) continue;

                var kistDet = kistDetailMap.GetValueOrDefault(acc.ID);
                decimal loanAmount = (decimal)(kistDet?.LoanAmountPassed ?? 0);
                DateTime? loanDate = kistDet?.LoanDate;

                // NPA amount and overdue calculation at ToDate
                decimal totalCrToDate = totalCrToToDateMap.GetValueOrDefault(acc.ID);
                decimal npaAmount = 0m;
                int overdueInstallments = 0;
                DateTime? overdueFromDate = null;

                var kists = kistByAccount.GetValueOrDefault(acc.ID);
                if (kists != null)
                {
                    decimal cumDue = 0m;
                    foreach (var kist in kists)
                    {
                        if (kist.Date > req.ToDate.Date) break;
                        cumDue += kist.KistAmt;
                        if (cumDue > totalCrToDate && overdueFromDate == null)
                            overdueFromDate = kist.Date;
                    }
                    npaAmount = Math.Max(0m, cumDue - totalCrToDate);
                    overdueInstallments = overdueFromDate.HasValue
                        ? kists.Count(k => k.Date >= overdueFromDate && k.Date <= req.ToDate.Date)
                        : 0;
                }

                int daysOverdue;
                if (fromLoanDate && loanDate.HasValue)
                    daysOverdue = (int)(req.ToDate.Date - loanDate.Value.Date).TotalDays;
                else if (overdueFromDate.HasValue)
                    daysOverdue = (int)(req.ToDate.Date - overdueFromDate.Value.Date).TotalDays;
                else
                    daysOverdue = 0;

                if (daysOverdue < 0) daysOverdue = 0;

                int compareValue = useInstallments ? overdueInstallments : (int)(daysOverdue / 30.0);

                // Determine NPA category
                NPAPlanCategory? matchedCat = null;
                foreach (var cat in allCategories)
                {
                    int from = cat.PeriodFrom ?? 0;
                    int to   = (cat.PeriodTo.HasValue && cat.PeriodTo.Value > 0) ? cat.PeriodTo.Value : int.MaxValue;
                    if (compareValue >= from && compareValue <= to)
                    {
                        matchedCat = cat;
                        break;
                    }
                }

                if (matchedCat == null) continue;
                if (req.CategoryIds.Any() && !req.CategoryIds.Contains(matchedCat.Id)) continue;

                rows.Add(new NpaLedgerRowDTO
                {
                    AccountId         = acc.ID,
                    AccountNumber     = acc.AccountNumber ?? "",
                    AccountName       = acc.AccountName ?? "",
                    MemberName        = acc.MemberId.HasValue ? memberNameMap.GetValueOrDefault(acc.MemberId.Value, "") : "",
                    LoanProductName   = acc.GeneralProductId.HasValue ? productNames.GetValueOrDefault(acc.GeneralProductId.Value, "") : "",
                    LoanDate          = loanDate,
                    LoanAmount        = loanAmount,
                    OpeningBalance    = openingBalance,
                    LoanAdvanced      = loanAdvanced,
                    Repaid            = repaid,
                    ClosingBalance    = closingBalance,
                    NpaAmount         = npaAmount,
                    DaysOverdue       = daysOverdue,
                    OverdueInstallments = overdueInstallments,
                    CategoryId        = matchedCat.Id,
                    CategoryName      = matchedCat.Description ?? "",
                });
            }

            var catSeqMap = allCategories.ToDictionary(c => c.Id, c => c.SeqNo ?? 999);
            rows = rows
                .OrderBy(r => catSeqMap.GetValueOrDefault(r.CategoryId, 999))
                .ThenBy(r => r.AccountNumber)
                .ToList();

            return new NpaLedgerDTO
            {
                BranchName          = branch?.branchmaster_name ?? "",
                BranchAddress       = branch?.branchmaster_addressline ?? "",
                FromDate            = req.FromDate,
                ToDate              = req.ToDate,
                PlanName            = plan.Description ?? plan.Code,
                Rows                = rows,
                TotalOpeningBalance = rows.Sum(r => r.OpeningBalance),
                TotalLoanAdvanced   = rows.Sum(r => r.LoanAdvanced),
                TotalRepaid         = rows.Sum(r => r.Repaid),
                TotalClosingBalance = rows.Sum(r => r.ClosingBalance),
                TotalNpa            = rows.Sum(r => r.NpaAmount),
            };
        }
    }
}
