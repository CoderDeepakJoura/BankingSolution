using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;

namespace BankingPlatform.API.Service.Salary
{
    public class BonusReportService
    {
        private readonly BankingDbContext _db;
        public BonusReportService(BankingDbContext db) => _db = db;

        public async Task<BonusReportResponseDTO> GetBonusReportAsync(BonusReportRequestDTO req)
        {
            if (!DateTime.TryParse(req.FromDate, out var fromDate))
                throw new ArgumentException("Invalid FromDate");
            if (!DateTime.TryParse(req.ToDate, out var toDate))
                throw new ArgumentException("Invalid ToDate");

            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.BranchId);

            var employees = await _db.employeemaster.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.status == 1)
                .OrderBy(x => x.firstname).ThenBy(x => x.lastname)
                .ToListAsync();

            var designations = await _db.employeedesignation.AsNoTracking()
                .Where(x => x.branchid == req.BranchId)
                .ToDictionaryAsync(x => x.id, x => x.description);

            // First non-deduction component by seqno = Basic salary
            var basicComp = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.isdeduction == (short)0)
                .OrderBy(x => x.seqno)
                .FirstOrDefaultAsync();

            // Load all emp-wise amounts for this branch <= toDate in one query
            var allEmpAmounts = basicComp != null
                ? await _db.salarycompempwise.AsNoTracking()
                    .Where(x => x.branchid == req.BranchId && x.compid == basicComp.id && x.date <= toDate)
                    .ToListAsync()
                : new List<Infrastructure.Models.Salary.SalaryCompEmpWise>();

            // Load all attendance for this branch in range in one query
            // attmonth is stored as first-of-month; include months that overlap [fromDate, toDate]
            var firstOfFrom = new DateTime(fromDate.Year, fromDate.Month, 1);
            var firstOfTo   = new DateTime(toDate.Year,   toDate.Month,   1);
            var allAttendance = await _db.employeeattendance.AsNoTracking()
                .Where(x => x.branchid == req.BranchId
                    && x.attmonth >= firstOfFrom && x.attmonth <= firstOfTo)
                .ToListAsync();

            var rows = new List<BonusReportRowDTO>();
            int srNo = 1;

            foreach (var emp in employees)
            {
                // Latest basic salary entry <= toDate for this employee
                decimal basicSalary = allEmpAmounts
                    .Where(x => x.empid == emp.id)
                    .OrderByDescending(x => x.date)
                    .Select(x => x.amount)
                    .FirstOrDefault();

                // Sum of LWP (leave without pay) across all months in range
                decimal leaveCount = allAttendance
                    .Where(x => x.empid == emp.id)
                    .Sum(x => x.lwp);

                decimal bonusDays = req.Days;
                decimal daysDeducted = leaveCount > 0 ? Math.Round((leaveCount / 365m) * bonusDays, 4) : 0;
                decimal effectiveBonusDays = Math.Round(bonusDays - daysDeducted, 4);
                decimal bonusAmt = basicSalary > 0 ? Math.Round((basicSalary / 30m) * effectiveBonusDays, 2) : 0;

                rows.Add(new BonusReportRowDTO
                {
                    SrNo          = srNo++,
                    EmpId         = emp.id,
                    EmpName       = $"{emp.firstname} {emp.lastname}".Trim(),
                    Designation   = designations.TryGetValue(emp.designationid, out var d) ? d : "",
                    LeaveCount    = leaveCount,
                    BonusDays     = effectiveBonusDays,
                    BasicSalary   = basicSalary,
                    Bonus         = bonusAmt,
                });
            }

            return new BonusReportResponseDTO
            {
                BranchName    = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate      = req.FromDate,
                ToDate        = req.ToDate,
                Days          = req.Days,
                TotalBonus    = rows.Sum(r => r.Bonus),
                Rows          = rows,
            };
        }
    }
}
