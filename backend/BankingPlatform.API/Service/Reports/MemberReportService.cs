using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class MemberReportRowDTO
    {
        public string BranchCode { get; set; } = "";
        public string MemberName { get; set; } = "";
        public string MembershipNo { get; set; } = "";
        public string HoNo { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string Relation { get; set; } = "";
        public DateTime DOB { get; set; }
        public string NomineeName { get; set; } = "";
        public int NomineeAge { get; set; }
        public string Address { get; set; } = "";
        public string PostOffice { get; set; } = "";
        public string Tehsil { get; set; } = "";
        public string PhoneNo { get; set; } = "";
        public DateTime JoiningDate { get; set; }
        public decimal ShareBalance { get; set; }
        public string ShareBalType { get; set; } = "Cr";
    }

    public class MemberReportDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<MemberReportRowDTO> Rows { get; set; } = new();
    }

    public class MemberReportService
    {
        private readonly BankingDbContext _db;
        public MemberReportService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, MemberReportDTO? data)> GetMemberReportAsync(
            int branchId,
            int memberType,      // 0=Both, 1=Nominal, 2=Permanent/HO
            int villageId,       // 0=All
            int gender,          // 0=All, 1=Male, 2=Female
            DateTime fromDate,
            DateTime toDate,
            int memberStatus,    // 0=All, 1=Active only
            decimal fromAmount,
            decimal toAmount,
            int postOfficeId)    // 0=All
        {
            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            // Base query: members for this branch with joining date filter
            var query =
                from m in _db.member.AsNoTracking()
                join rel in _db.relation.AsNoTracking() on m.RelationId equals rel.id into relj
                from rel in relj.DefaultIfEmpty()
                join loc in _db.memberlocationdetails.AsNoTracking()
                    on new { MemberId = m.Id, m.BranchId } equals new { loc.MemberId, loc.BranchId } into locj
                from loc in locj.DefaultIfEmpty()
                join v in _db.village.AsNoTracking() on (loc != null ? loc.VillageId1 : 0) equals v.id into vj
                from v in vj.DefaultIfEmpty()
                join po in _db.postoffice.AsNoTracking() on (loc != null ? loc.PO1 : 0) equals po.id into poj
                from po in poj.DefaultIfEmpty()
                join te in _db.tehsil.AsNoTracking() on (loc != null ? loc.Tehsil1 : 0) equals te.id into tej
                from te in tej.DefaultIfEmpty()
                join nom in _db.membernomineedetails.AsNoTracking()
                    on new { MemberId = m.Id, m.BranchId } equals new { nom.MemberId, nom.BranchId } into nomj
                from nom in nomj.DefaultIfEmpty()
                where m.BranchId == branchId
                   && m.JoiningDate >= fromDate.Date
                   && m.JoiningDate <= toDate.Date
                select new
                {
                    m.Id,
                    m.MemberName,
                    m.RelativeName,
                    m.RelationId,
                    RelationDesc     = rel != null ? rel.description : "",
                    m.Gender,
                    m.DOB,
                    m.JoiningDate,
                    m.PhonePrefix1,
                    m.PhoneNo1,
                    m.MemberStatus,
                    m.MemberType,
                    m.NominalMembershipNo,
                    m.PermanentMembershipNo,
                    AddressLine1 = loc != null ? loc.AddressLine1 : "",
                    VillageName  = v != null ? v.villagename : "",
                    PoId         = loc != null ? loc.PO1 : 0,
                    PostOfficeName = po != null ? po.postofficename : "",
                    TehsilName   = te != null ? te.tehsilname : "",
                    NomineeName  = nom != null ? nom.NomineeName : "",
                    NomineeAge   = nom != null ? nom.Age : 0,
                    VillageId    = loc != null ? loc.VillageId1 : 0,
                };

            // Apply filters
            if (gender != 0)
                query = query.Where(x => x.Gender == gender);

            if (memberStatus == 1)
                query = query.Where(x => x.MemberStatus == 1);

            if (memberType == 1)      // Nominal/Branch
                query = query.Where(x => x.MemberType == 1);
            else if (memberType == 2)  // Permanent/HO
                query = query.Where(x => x.MemberType == 2);

            if (villageId != 0)
                query = query.Where(x => x.VillageId == villageId);

            if (postOfficeId != 0)
                query = query.Where(x => x.PoId == postOfficeId);

            var members = await query.ToListAsync();

            if (!members.Any())
                return (true, "No members found.", new MemberReportDTO
                {
                    BranchName    = branch?.branchmaster_name ?? "",
                    BranchAddress = branch?.branchmaster_addressline ?? "",
                    FromDate      = fromDate,
                    ToDate        = toDate,
                    Rows          = new List<MemberReportRowDTO>()
                });

            // Batch: get share accounts for all matched members
            var memberIds = members.Select(m => m.Id).Distinct().ToList();

            var shareAccounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId
                         && a.AccTypeId == (int)Enums.AccountTypes.ShareMoney
                         && a.MemberId != null
                         && memberIds.Contains(a.MemberId.Value))
                .Select(a => new { a.ID, MemberId = a.MemberId!.Value })
                .ToListAsync();

            var accountIds = shareAccounts.Select(a => a.ID).ToList();

            // Opening balances
            var openingBals = await _db.accopeningbalance.AsNoTracking()
                .Where(ob => ob.BranchId == branchId && accountIds.Contains(ob.AccountId))
                .Select(ob => new { ob.AccountId, ob.OpeningAmount, ob.EntryType })
                .ToListAsync();

            // Transaction sums
            var drSums = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.VoucherEntryType == "Dr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { AccountId = g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToListAsync();

            var crSums = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(v => accountIds.Contains(v.AccountId) && v.VoucherEntryType == "Cr")
                .GroupBy(v => v.AccountId)
                .Select(g => new { AccountId = g.Key, Total = g.Sum(v => v.VoucherAmount) })
                .ToListAsync();

            // Build balance lookup: memberId → (absBalance, balType)
            var balanceByMember = new Dictionary<int, (decimal Amount, string Type)>();
            foreach (var sa in shareAccounts)
            {
                var ob  = openingBals.FirstOrDefault(x => x.AccountId == sa.ID);
                decimal initial = ob == null ? 0m
                    : (ob.EntryType?.ToUpper() == "DR" ? ob.OpeningAmount : -ob.OpeningAmount);

                decimal dr  = drSums.FirstOrDefault(x => x.AccountId == sa.ID)?.Total ?? 0m;
                decimal cr  = crSums.FirstOrDefault(x => x.AccountId == sa.ID)?.Total ?? 0m;
                decimal net = initial + dr - cr;
                balanceByMember[sa.MemberId] = (Math.Abs(net), net < 0 ? "Cr" : "Dr");
            }

            string branchCode = branch?.branchmaster_code ?? "";

            // Build rows — deduplicate by member Id (left join on nominee can produce duplicates)
            var seenIds = new HashSet<int>();
            var rows = new List<MemberReportRowDTO>();

            foreach (var m in members)
            {
                if (!seenIds.Add(m.Id)) continue;

                var (shareBalance, shareBalType) = balanceByMember.TryGetValue(m.Id, out var bal)
                    ? bal : (0m, "Cr");

                // Apply share balance filter (0/0 = no filter)
                if (fromAmount > 0 || toAmount > 0)
                {
                    if (fromAmount > 0 && shareBalance < fromAmount) continue;
                    if (toAmount > 0 && shareBalance > toAmount) continue;
                }

                string address = string.IsNullOrWhiteSpace(m.VillageName)
                    ? m.AddressLine1
                    : string.IsNullOrWhiteSpace(m.AddressLine1)
                        ? m.VillageName
                        : $"{m.AddressLine1}, {m.VillageName}";

                rows.Add(new MemberReportRowDTO
                {
                    BranchCode    = branchCode,
                    MemberName    = m.MemberName,
                    MembershipNo  = m.NominalMembershipNo ?? "",
                    HoNo          = m.PermanentMembershipNo ?? "",
                    RelativeName  = m.RelativeName,
                    Relation      = m.RelationDesc ?? "",
                    DOB           = m.DOB,
                    NomineeName   = m.NomineeName ?? "",
                    NomineeAge    = m.NomineeAge,
                    Address       = address,
                    PostOffice    = m.PostOfficeName ?? "",
                    Tehsil        = m.TehsilName ?? "",
                    PhoneNo       = $"{m.PhonePrefix1}{m.PhoneNo1}".Trim(),
                    JoiningDate   = m.JoiningDate,
                    ShareBalance  = shareBalance,
                    ShareBalType  = shareBalType,
                });
            }

            return (true, "Success", new MemberReportDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate      = fromDate,
                ToDate        = toDate,
                Rows          = rows,
            });
        }
    }
}
