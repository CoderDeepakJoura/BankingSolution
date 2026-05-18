using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    public class MemberSearchResultDTO
    {
        public int Id { get; set; }
        public string DisplayName { get; set; } = "";
        public string MembershipNo { get; set; } = "";
    }

    public class MemberIntCertRowDTO
    {
        public string AccountNo { get; set; } = "";
        public string AccountType { get; set; } = "";
        public decimal InterestAmount { get; set; }
        public decimal TDSAmount { get; set; }
    }

    public class MemberIntCertDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public string MemberName { get; set; } = "";
        public string RelativeName { get; set; } = "";
        public string RelationName { get; set; } = "";
        public string MembershipNo { get; set; } = "";
        public int MemberId { get; set; }
        public string AddressLine1 { get; set; } = "";
        public string AddressLine2 { get; set; } = "";
        public string VillageName { get; set; } = "";
        public string Pincode { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string FinancialYear { get; set; } = "";
        public List<MemberIntCertRowDTO> Rows { get; set; } = new();
        public decimal TotalInterest { get; set; }
        public decimal TotalTDS { get; set; }
    }

    public class MemberIntCertService
    {
        private readonly BankingDbContext _db;
        public MemberIntCertService(BankingDbContext db) => _db = db;

        public async Task<(bool success, string message, List<MemberSearchResultDTO>? data)> SearchMembersAsync(int branchId, string query)
        {
            var q = query.Trim().ToLower();
            var members = await (
                from m in _db.member.AsNoTracking()
                join rel in _db.relation.AsNoTracking() on m.RelationId equals rel.id into relj
                from rel in relj.DefaultIfEmpty()
                where m.BranchId == branchId
                    && (q == "" || m.MemberName.ToLower().Contains(q)
                        || (m.PermanentMembershipNo != null && m.PermanentMembershipNo.ToLower().Contains(q))
                        || (m.NominalMembershipNo != null && m.NominalMembershipNo.ToLower().Contains(q)))
                orderby m.MemberName
                select new MemberSearchResultDTO
                {
                    Id           = m.Id,
                    MembershipNo = m.PermanentMembershipNo ?? m.NominalMembershipNo ?? "",
                    DisplayName  = m.PermanentMembershipNo != null
                        ? m.PermanentMembershipNo + " (Permanent) - " + m.MemberName
                        : m.NominalMembershipNo != null
                            ? m.NominalMembershipNo + " (Nominal) - " + m.MemberName
                            : m.MemberName,
                }
            ).Take(20).ToListAsync();
            return (true, "OK", members);
        }

        public async Task<(bool success, string message, List<MemberSearchResultDTO>? data)> GetAllMembersAsync(int branchId)
        {
            var members = await (
                from m in _db.member.AsNoTracking()
                where m.BranchId == branchId
                orderby m.PermanentMembershipNo ?? m.NominalMembershipNo ?? m.MemberName
                select new MemberSearchResultDTO
                {
                    Id           = m.Id,
                    MembershipNo = m.PermanentMembershipNo ?? m.NominalMembershipNo ?? "",
                    DisplayName  = m.PermanentMembershipNo != null
                        ? m.PermanentMembershipNo + " (Permanent) - " + m.MemberName
                        : m.NominalMembershipNo != null
                            ? m.NominalMembershipNo + " (Nominal) - " + m.MemberName
                            : m.MemberName,
                }
            ).ToListAsync();
            return (true, "OK", members);
        }

        public async Task<(bool success, string message, MemberIntCertDTO? data)> GetMemberIntCertAsync(
            int branchId, int memberId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(b => b.id == branchId);

            var memberInfo = await (
                from m in _db.member.AsNoTracking()
                join rel in _db.relation.AsNoTracking() on m.RelationId equals rel.id into relj
                from rel in relj.DefaultIfEmpty()
                join loc in _db.memberlocationdetails.AsNoTracking() on new { m.Id, m.BranchId } equals new { Id = loc.MemberId, loc.BranchId } into locj
                from loc in locj.DefaultIfEmpty()
                join v in _db.village.AsNoTracking() on (loc != null ? loc.VillageId1 : 0) equals v.id into vj
                from v in vj.DefaultIfEmpty()
                where m.Id == memberId && m.BranchId == branchId
                select new
                {
                    m.MemberName,
                    m.RelativeName,
                    RelationName  = rel != null ? rel.description : "",
                    MembershipNo  = m.PermanentMembershipNo ?? m.NominalMembershipNo ?? "",
                    AddressLine1  = loc != null ? loc.AddressLine1 : "",
                    AddressLine2  = loc != null ? (loc.AddressLine2 ?? "") : "",
                    VillageName   = v != null ? v.villagename : "",
                    Pincode       = v != null ? v.pincode.ToString() : "",
                }
            ).FirstOrDefaultAsync();

            if (memberInfo == null)
                return (false, "Member not found.", null);

            // Get all accounts for this member (Saving=2, RD=5, FD=6)
            var accounts = await _db.accountmaster.AsNoTracking()
                .Where(a => a.BranchId == branchId && a.MemberId == memberId && new[] { 2, 5, 6 }.Contains(a.AccTypeId))
                .Select(a => new { a.ID, a.AccountNumber, a.AccPrefix, a.AccTypeId })
                .ToListAsync();

            var nextDay = toDate.Date.AddDays(1);
            var rows = new List<MemberIntCertRowDTO>();

            foreach (var acc in accounts)
            {
                decimal intAmt = 0m;
                decimal tdsAmt = 0m;

                if (acc.AccTypeId == 2) // Saving
                {
                    intAmt = await _db.vouchersavingdetail.AsNoTracking()
                        .Where(s => s.AccId == acc.ID
                            && s.VoucherDate >= fromDate.Date && s.VoucherDate < nextDay
                            && s.VoucherMainStatus == "V"
                            && (s.Operation == "IP" || s.Operation == "IPO"))
                        .SumAsync(s => s.Amt ?? 0m);
                }
                else if (acc.AccTypeId == 5) // RD
                {
                    var rdSum = await _db.voucherrddetail.AsNoTracking()
                        .Where(r => r.RdAccId == acc.ID
                            && r.VoucherDate >= fromDate.Date && r.VoucherDate < nextDay
                            && r.VoucherMainStatus == "V"
                            && (r.Operation == "IP" || r.Operation == "IPO"))
                        .SumAsync(r => (decimal)r.AmountCr + (r.IntCr.HasValue ? (decimal)r.IntCr.Value : 0m));
                    intAmt = rdSum;
                }
                else if (acc.AccTypeId == 6) // FD
                {
                    var fdSum = await _db.voucherfddetail.AsNoTracking()
                        .Where(f => f.FDAccId == acc.ID
                            && f.VoucherDate >= fromDate.Date && f.VoucherDate < nextDay
                            && f.VoucherMainStatus == "V"
                            && (f.Operation == "IP" || f.Operation == "IPO"))
                        .SumAsync(f => (f.IntCr ?? 0m) + f.AmountCr);

                    // FD MIS interest paid via RD (OthRefAccId = FD acc)
                    var fdMisRd = await _db.voucherrddetail.AsNoTracking()
                        .Where(r => r.OthRefAccId == acc.ID
                            && r.VoucherDate >= fromDate.Date && r.VoucherDate < nextDay
                            && r.VoucherMainStatus == "V"
                            && r.Operation == "IPO")
                        .SumAsync(r => (decimal)r.AmountCr);

                    intAmt = fdSum + fdMisRd;
                }

                var accNo = !string.IsNullOrEmpty(acc.AccountNumber) ? acc.AccountNumber : acc.ID.ToString();
                var displayNo = !string.IsNullOrEmpty(acc.AccPrefix) ? $"{acc.AccPrefix}-{accNo}" : accNo;
                var accType = acc.AccTypeId switch { 2 => "Saving", 5 => "RD", 6 => "FD", _ => "" };
                rows.Add(new MemberIntCertRowDTO { AccountNo = displayNo, AccountType = accType, InterestAmount = intAmt, TDSAmount = tdsAmt });
            }

            // Financial year: Apr–Mar cycle
            int fyStart = toDate.Month >= 4 ? toDate.Year : toDate.Year - 1;
            string financialYear = $"{fyStart}-{fyStart + 1}";

            return (true, "OK", new MemberIntCertDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                MemberName    = memberInfo.MemberName,
                RelativeName  = memberInfo.RelativeName,
                RelationName  = memberInfo.RelationName,
                MembershipNo  = memberInfo.MembershipNo,
                MemberId      = memberId,
                AddressLine1  = memberInfo.AddressLine1,
                AddressLine2  = memberInfo.AddressLine2,
                VillageName   = memberInfo.VillageName,
                Pincode       = memberInfo.Pincode,
                FromDate      = fromDate,
                ToDate        = toDate,
                FinancialYear = financialYear,
                Rows          = rows,
                TotalInterest = rows.Sum(r => r.InterestAmount),
                TotalTDS      = rows.Sum(r => r.TDSAmount),
            });
        }
    }
}
