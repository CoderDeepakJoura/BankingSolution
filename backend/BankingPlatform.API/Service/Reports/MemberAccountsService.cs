using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class MemberAccountsListItemDTO
    {
        public int Id { get; set; }
        public string MemberName { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string VillageName { get; set; } = "";
        public string MembershipNo { get; set; } = "";
        public string SmAccountNo { get; set; } = "";
        public string MemberType { get; set; } = "";
    }

    public class MemberAccountItemDTO
    {
        public string AccountNo { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string AccType { get; set; } = "";
        public string ProductName { get; set; } = "";
        public decimal Balance { get; set; }
        public string BalType { get; set; } = "Cr";
    }

    public class MemberGuarantorInfoDTO
    {
        public string ProductCode { get; set; } = "";
        public string ProductName { get; set; } = "";
        public string LoanAccNo { get; set; } = "";
        public string LoanAccName { get; set; } = "";
    }

    public class MemberAccountsDetailDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string MemberName { get; set; } = "";
        public string MembershipNo { get; set; } = "";
        public string SmAccountNo { get; set; } = "";
        public DateTime AsOnDate { get; set; }
        public List<MemberGuarantorInfoDTO> GuarantorDetails { get; set; } = new();
        public List<MemberAccountItemDTO> Accounts { get; set; } = new();
    }

    // Simple product lookup record used internally
    file sealed record ProductEntry(int Id, string Code, string Name);

    public class MemberAccountsService
    {
        private readonly BankingDbContext _db;
        public MemberAccountsService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<MemberAccountsListItemDTO>? data)> SearchMembersAsync(
            int branchId, string searchTerm)
        {
            var term = (searchTerm ?? "").Trim().ToLower();

            // Find member IDs that own a share-money account matching the search term
            var smAccMemIds = term.Length > 0
                ? await _db.accountmaster.AsNoTracking()
                    .Where(a => a.BranchId == branchId
                             && a.AccTypeId == (int)Enums.AccountTypes.ShareMoney
                             && a.AccountNumber.ToLower().Contains(term)
                             && a.MemberId != null)
                    .Select(a => a.MemberId!.Value)
                    .Distinct()
                    .ToListAsync()
                : new List<int>();

            var rawMembers = await (
                from m in _db.member.AsNoTracking()
                join loc in _db.memberlocationdetails.AsNoTracking()
                    on new { MemberId = m.Id, m.BranchId } equals new { loc.MemberId, loc.BranchId } into locj
                from loc in locj.DefaultIfEmpty()
                join v in _db.village.AsNoTracking() on (loc != null ? loc.VillageId1 : 0) equals v.id into vj
                from v in vj.DefaultIfEmpty()
                where m.BranchId == branchId
                   && (term == ""
                       || (m.NominalMembershipNo != null && m.NominalMembershipNo.ToLower().Contains(term))
                       || (m.PermanentMembershipNo != null && m.PermanentMembershipNo.ToLower().Contains(term))
                       || m.MemberName.ToLower().Contains(term)
                       || smAccMemIds.Contains(m.Id))
                orderby m.PermanentMembershipNo ?? m.NominalMembershipNo ?? m.MemberName
                select new
                {
                    m.Id,
                    m.MemberName,
                    m.RelativeName,
                    VillageName  = v != null ? v.villagename : "",
                    m.NominalMembershipNo,
                    m.PermanentMembershipNo,
                    m.MemberType,
                }
            ).Take(100).ToListAsync();

            if (!rawMembers.Any())
                return (true, "No members found.", new List<MemberAccountsListItemDTO>());

            // Batch-fetch SM account numbers
            var memberIds  = rawMembers.Select(m => m.Id).ToList();
            var smAccounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId
                         && a.AccTypeId == (int)Enums.AccountTypes.ShareMoney
                         && a.MemberId != null
                         && memberIds.Contains(a.MemberId.Value))
                .Select(a => new { MemberId = a.MemberId!.Value, a.AccountNumber })
                .ToListAsync();

            var smByMember = smAccounts
                .GroupBy(a => a.MemberId)
                .ToDictionary(g => g.Key, g => string.Join(", ", g.Select(a => a.AccountNumber)));

            var result = rawMembers.Select(m => new MemberAccountsListItemDTO
            {
                Id           = m.Id,
                MemberName   = m.MemberName,
                RelativeName = m.RelativeName,
                VillageName  = m.VillageName ?? "",
                MembershipNo = m.PermanentMembershipNo ?? m.NominalMembershipNo ?? "",
                SmAccountNo  = smByMember.TryGetValue(m.Id, out var sn) ? sn : "",
                MemberType   = m.MemberType == 2 ? "Permanent" : m.MemberType == 1 ? "Nominal" : "",
            }).ToList();

            return (true, "OK", result);
        }

        public async Task<(bool success, string message, MemberAccountsDetailDTO? data)> GetMemberAccountsDetailAsync(
            int branchId, int memberId, DateTime asOnDate)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            var member = await _db.member.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == memberId && m.BranchId == branchId);
            if (member == null)
                return (false, "Member not found.", null);

            var smAccNo = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId && a.AccTypeId == (int)Enums.AccountTypes.ShareMoney && a.MemberId == memberId)
                .Select(a => a.AccountNumber)
                .FirstOrDefaultAsync() ?? "";

            // All non-closed accounts for this member
            var rawAccounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId && a.MemberId == memberId && !a.IsAccClosed)
                .OrderBy(a => a.AccTypeId).ThenBy(a => a.AccSuffix)
                .Select(a => new
                {
                    a.ID,
                    a.AccTypeId,
                    a.AccountNumber,
                    a.AccPrefix,
                    a.AccSuffix,
                    a.AccountName,
                    a.GeneralProductId,
                    a.HeadId,
                })
                .ToListAsync();

            var accountIds = rawAccounts.Select(a => a.ID).ToList();

            // Batch: opening balances
            var openingBals = await _db.accopeningbalance.AsNoTracking()
                .Where(ob => ob.BranchId == branchId && accountIds.Contains(ob.AccountId))
                .Select(ob => new { ob.AccountId, ob.OpeningAmount, ob.EntryType })
                .ToListAsync();

            var nextDay = asOnDate.Date.AddDays(1);

            var drSums = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.VoucherEntryType == "Dr" && v.ValueDate < nextDay)
                .GroupBy(v => v.AccountId)
                .Select(g => new { AccountId = g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToListAsync();

            var crSums = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.VoucherEntryType == "Cr" && v.ValueDate < nextDay)
                .GroupBy(v => v.AccountId)
                .Select(g => new { AccountId = g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToListAsync();

            // Batch product lookups
            var productIds = rawAccounts
                .Where(a => a.GeneralProductId.HasValue)
                .Select(a => a.GeneralProductId!.Value)
                .Distinct().ToList();

            List<ProductEntry> loanProds = productIds.Count > 0
                ? (await _db.loanproduct.AsNoTracking().Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, Code = p.Code ?? "", p.ProductName }).ToListAsync())
                    .Select(p => new ProductEntry(p.Id, p.Code, p.ProductName)).ToList()
                : new();

            List<ProductEntry> fdProds = productIds.Count > 0
                ? (await _db.fdproduct.AsNoTracking().Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, Code = p.ProductCode ?? "", p.ProductName }).ToListAsync())
                    .Select(p => new ProductEntry(p.Id, p.Code, p.ProductName)).ToList()
                : new();

            List<ProductEntry> rdProds = productIds.Count > 0
                ? (await _db.rdproduct.AsNoTracking().Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, Code = p.ProductCode ?? "", p.ProductName }).ToListAsync())
                    .Select(p => new ProductEntry(p.Id, p.Code, p.ProductName)).ToList()
                : new();

            List<ProductEntry> savProds = productIds.Count > 0
                ? (await _db.savingproduct.AsNoTracking().Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, Code = p.ProductCode ?? "", p.ProductName }).ToListAsync())
                    .Select(p => new ProductEntry(p.Id, p.Code, p.ProductName)).ToList()
                : new();

            // Account head names for General accounts
            var headIds = rawAccounts.Where(a => a.AccTypeId == (int)Enums.AccountTypes.General)
                .Select(a => a.HeadId).Distinct().ToList();
            var headNames = headIds.Count > 0
                ? await _db.accounthead.AsNoTracking().Where(h => headIds.Contains(h.id))
                    .ToDictionaryAsync(h => h.id, h => h.name ?? "")
                : new Dictionary<int, string>();

            var accTypeNames = new Dictionary<int, string>
            {
                [(int)Enums.AccountTypes.Loan]       = "Loan",
                [(int)Enums.AccountTypes.Saving]     = "Saving",
                [(int)Enums.AccountTypes.General]    = "General",
                [(int)Enums.AccountTypes.ShareMoney] = "ShareMoney",
                [(int)Enums.AccountTypes.RD]         = "RD",
                [(int)Enums.AccountTypes.FD]         = "FD",
                [(int)Enums.AccountTypes.BankFD]     = "BankFD",
            };

            var accountItems = new List<MemberAccountItemDTO>();
            foreach (var a in rawAccounts)
            {
                var ob      = openingBals.FirstOrDefault(x => x.AccountId == a.ID);
                decimal ini = ob == null ? 0m
                    : (ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount);
                decimal dr  = drSums.FirstOrDefault(x => x.AccountId == a.ID)?.Total ?? 0m;
                decimal cr  = crSums.FirstOrDefault(x => x.AccountId == a.ID)?.Total ?? 0m;
                decimal net = ini + dr - cr;

                string accNo = !string.IsNullOrWhiteSpace(a.AccountNumber)
                    ? a.AccountNumber : $"{a.AccPrefix}-{a.AccSuffix}";

                string productName = "";
                if (a.GeneralProductId.HasValue)
                {
                    int pid = a.GeneralProductId.Value;
                    productName = a.AccTypeId switch
                    {
                        (int)Enums.AccountTypes.Loan   => loanProds.FirstOrDefault(p => p.Id == pid)?.Name ?? "",
                        (int)Enums.AccountTypes.FD     => fdProds.FirstOrDefault(p => p.Id == pid)?.Name ?? "",
                        (int)Enums.AccountTypes.BankFD => fdProds.FirstOrDefault(p => p.Id == pid)?.Name ?? "",
                        (int)Enums.AccountTypes.RD     => rdProds.FirstOrDefault(p => p.Id == pid)?.Name ?? "",
                        (int)Enums.AccountTypes.Saving => savProds.FirstOrDefault(p => p.Id == pid)?.Name ?? "",
                        _ => ""
                    };
                }
                if (a.AccTypeId == (int)Enums.AccountTypes.General)
                    productName = headNames.TryGetValue(a.HeadId, out var hn) ? hn : "";

                accountItems.Add(new MemberAccountItemDTO
                {
                    AccountNo   = accNo,
                    AccountName = a.AccountName ?? "",
                    AccType     = accTypeNames.TryGetValue(a.AccTypeId, out var tn) ? tn : "",
                    ProductName = productName,
                    Balance     = Math.Abs(net),
                    BalType     = net < 0 ? "Cr" : "Dr",
                });
            }

            // Guarantor info
            var guarLoanAccIds = await _db.loanguarwitness.AsNoTracking()
                .Where(g => g.BrId == branchId
                         && (g.Guar1MemId == memberId || g.Guar2MemId == memberId)
                         && g.LoanAccId != null)
                .Select(g => g.LoanAccId!.Value)
                .Distinct()
                .ToListAsync();

            var guarantorItems = new List<MemberGuarantorInfoDTO>();
            if (guarLoanAccIds.Any())
            {
                var loanAccounts = await _db.accountmaster.AsNoTracking()
                    .Where(a => guarLoanAccIds.Contains(a.ID))
                    .Select(a => new { a.ID, a.AccountNumber, a.AccountName, a.GeneralProductId })
                    .ToListAsync();

                foreach (var la in loanAccounts)
                {
                    string prodCode = "";
                    string prodName = "";
                    if (la.GeneralProductId.HasValue)
                    {
                        var lp = loanProds.FirstOrDefault(p => p.Id == la.GeneralProductId.Value);
                        prodCode = lp?.Code ?? "";
                        prodName = lp?.Name ?? "";
                    }
                    guarantorItems.Add(new MemberGuarantorInfoDTO
                    {
                        ProductCode = prodCode,
                        ProductName = prodName,
                        LoanAccNo   = la.AccountNumber ?? "",
                        LoanAccName = la.AccountName ?? "",
                    });
                }
            }

            return (true, "OK", new MemberAccountsDetailDTO
            {
                BranchName       = branch?.branchmaster_name ?? "",
                BranchAddress    = branch?.branchmaster_addressline ?? "",
                MemberName       = member.MemberName,
                MembershipNo     = member.PermanentMembershipNo ?? member.NominalMembershipNo ?? "",
                SmAccountNo      = smAccNo,
                AsOnDate         = asOnDate,
                GuarantorDetails = guarantorItems,
                Accounts         = accountItems,
            });
        }
    }
}
