using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Salary;

namespace BankingPlatform.API.Service.Salary
{
    public class SalaryCreationService
    {
        private readonly BankingDbContext _db;
        public SalaryCreationService(BankingDbContext db) => _db = db;

        /// <summary>
        /// Replicates CSAS_SP_EmployeeSalaryCreation logic.
        /// Fetches salary components for one employee with amounts resolved:
        ///   emp-wise amount (latest date <= salaryDate) takes priority over grade-wise.
        /// </summary>
        public async Task<SalaryCreationResponseDTO?> GetSalaryCreationDataAsync(SalaryCreationRequestDTO req)
        {
            if (!DateTime.TryParse(req.SalaryDate, out var salaryDate)) return null;
            if (!DateTime.TryParse(req.DateFrom, out var dateFrom)) return null;
            if (!DateTime.TryParse(req.DateTo, out var dateTo)) return null;

            int daysInMonth = (int)(dateTo - dateFrom).TotalDays + 1;

            var emp = await _db.employeemaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.EmpId && x.branchid == req.BranchId);
            if (emp == null) return null;

            var desig = emp.designationid > 0
                ? await _db.employeedesignation.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.id == emp.designationid && x.branchid == req.BranchId)
                : null;

            // Get all salary components ordered by seqno
            var allComponents = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId)
                .OrderBy(x => x.seqno)
                .ToListAsync();

            // Employee-wise amounts: pick latest date <= salaryDate per component
            var empWiseAmounts = await _db.salarycompempwise.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.empid == req.EmpId && x.date <= salaryDate)
                .ToListAsync();

            // Group by compid, pick latest
            var empAmountByComp = empWiseAmounts
                .GroupBy(x => x.compid)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.date).First());

            // Build component lines
            var lines = new List<SalaryComponentLineDTO>();
            foreach (var comp in allComponents)
            {
                decimal amount = 0;
                short isActive = 1;

                if (empAmountByComp.TryGetValue(comp.id, out var empAmt))
                {
                    amount = empAmt.amount;
                    isActive = comp.defineamount == 1 ? empAmt.isactive : (short)1;
                }
                else
                {
                    // No emp-wise record → component is active but amount = 0 unless formula-driven
                    isActive = comp.defineamount == 1 ? (short)0 : (short)1;
                    amount = 0;
                }

                lines.Add(new SalaryComponentLineDTO
                {
                    ComponentId = comp.id,
                    Name = comp.alias,
                    IsActive = isActive,
                    Amount = amount,
                    AccId = comp.accid,
                    ComponentType = comp.type,
                    IsDeduction = comp.isdeduction
                });
            }

            return new SalaryCreationResponseDTO
            {
                EmpId = emp.id,
                EmployeeName = $"{emp.firstname} {emp.lastname}".Trim(),
                DesignationName = desig?.description ?? "",
                EmpType = emp.emptype,
                DaysInMonth = daysInMonth,
                Components = lines
            };
        }

        /// <summary>
        /// Save processed monthly salary for one or more employees.
        /// </summary>
        public async Task<string> SaveMonthlySalaryAsync(SaveMonthlySalaryDTO dto)
        {
            if (!DateTime.TryParse(dto.SalaryMonth, out var salaryMonth)) return "Invalid salary month.";

            // Check if already saved for this month
            var exists = await _db.monthlysalary.AnyAsync(x => x.branchid == dto.BranchId &&
                x.salarymonth.Year == salaryMonth.Year && x.salarymonth.Month == salaryMonth.Month);
            if (exists) return "Salary for this month is already processed. Delete first to re-process.";

            var header = new MonthlySalary
            {
                branchid = dto.BranchId,
                salarymonth = salaryMonth,
                processdate = DateTime.Now,
                sessionid = dto.SessionId,
                processedby = dto.ProcessedBy
            };
            await _db.monthlysalary.AddAsync(header);
            await _db.SaveChangesAsync();

            foreach (var emp in dto.Employees)
            {
                var empDetail = new MonthlySalaryEmpDetail
                {
                    branchid = dto.BranchId,
                    monthlysalaryid = header.id,
                    empid = emp.EmpId,
                    totalgross = emp.TotalGross,
                    totaldeduction = emp.TotalDeduction,
                    netpay = emp.NetPay
                };
                await _db.monthlysalaryempdetail.AddAsync(empDetail);
                await _db.SaveChangesAsync();

                foreach (var comp in emp.Components)
                {
                    await _db.monthlysalarycompdetail.AddAsync(new MonthlySalaryCompDetail
                    {
                        branchid = dto.BranchId,
                        monthlysalaryempid = empDetail.id,
                        compid = comp.CompId,
                        amount = comp.Amount,
                        isdeduction = comp.IsDeduction
                    });
                }
            }

            await _db.SaveChangesAsync();
            return "Success";
        }

        public async Task<List<object>> GetProcessedSalariesAsync(int branchId)
        {
            var records = await _db.monthlysalary.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .OrderByDescending(x => x.salarymonth)
                .Select(x => new { x.id, x.salarymonth, x.processdate, x.processedby })
                .ToListAsync();
            return records.Cast<object>().ToList();
        }
    }
}
