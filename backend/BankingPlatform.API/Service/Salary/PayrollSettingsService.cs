using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;

namespace BankingPlatform.API.Service.Salary
{
    public class PayrollSettingsService
    {
        private readonly BankingDbContext _db;
        public PayrollSettingsService(BankingDbContext db) => _db = db;

        public async Task<PayrollSettingsDTO?> GetByBranchAsync(int branchId)
        {
            var s = await _db.payrollsettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId);
            if (s == null) return null;

            var loanIds = await _db.payrollsettingsloancomp.AsNoTracking()
                .Where(x => x.payrollsettingsid == s.id)
                .Select(x => x.loanproductid)
                .ToListAsync();

            // resolve salary account name
            var accName = await _db.accountmaster.AsNoTracking()
                .Where(x => x.ID == s.salaryaccid)
                .Select(x => x.AccountNumber + " – " + x.AccountName)
                .FirstOrDefaultAsync() ?? "";

            return new PayrollSettingsDTO
            {
                Id = s.id,
                BranchId = s.branchid,
                SalaryAccId = s.salaryaccid,
                SalaryAccName = accName,
                StartDayOfMonth = s.startdayofmonth,
                DaysInMonth = s.daysinmonth,
                CpfHeadCode = s.cpfheadcode,
                RdHeadCode = s.rdheadcode,
                MaxSalaryForPf = s.maxsalaryforpf,
                ExtraEmployeePf = s.extraemployeepf,
                ExtraEmployerPf = s.extraemployerpf,
                MaxFpf = s.maxfpf,
                EmployeresicPerc = s.employeresicperc,
                EsicLimit = s.esiclimit,
                LoanProductIds = loanIds,
            };
        }

        public async Task<string> SaveAsync(PayrollSettingsDTO dto)
        {
            var existing = await _db.payrollsettings.FirstOrDefaultAsync(x => x.branchid == dto.BranchId);

            if (existing == null)
            {
                existing = new PayrollSettings { branchid = dto.BranchId };
                _db.payrollsettings.Add(existing);
            }

            existing.salaryaccid       = dto.SalaryAccId;
            existing.startdayofmonth   = dto.StartDayOfMonth;
            existing.daysinmonth       = dto.DaysInMonth;
            existing.cpfheadcode       = dto.CpfHeadCode ?? "";
            existing.rdheadcode        = dto.RdHeadCode ?? "";
            existing.maxsalaryforpf    = dto.MaxSalaryForPf;
            existing.extraemployeepf   = dto.ExtraEmployeePf;
            existing.extraemployerpf   = dto.ExtraEmployerPf;
            existing.maxfpf            = dto.MaxFpf;
            existing.employeresicperc  = dto.EmployeresicPerc;
            existing.esiclimit         = dto.EsicLimit;

            await _db.SaveChangesAsync();

            // replace loan components
            var old = _db.payrollsettingsloancomp.Where(x => x.payrollsettingsid == existing.id);
            _db.payrollsettingsloancomp.RemoveRange(old);

            foreach (var lpId in dto.LoanProductIds.Distinct())
                _db.payrollsettingsloancomp.Add(new PayrollSettingsLoanComp
                {
                    branchid = dto.BranchId,
                    payrollsettingsid = existing.id,
                    loanproductid = lpId,
                });

            await _db.SaveChangesAsync();
            return "Payroll settings saved successfully.";
        }
    }
}
