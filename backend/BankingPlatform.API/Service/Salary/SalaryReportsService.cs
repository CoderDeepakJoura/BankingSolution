using BankingPlatform.API.DTO.Salary;
using BankingPlatform.Infrastructure.Models;

namespace BankingPlatform.API.Service.Salary
{
    public class SalaryReportsService
    {
        private readonly BankingDbContext _db;
        public SalaryReportsService(BankingDbContext db) => _db = db;

        // ── Helpers ───────────────────────────────────────────────────────────

        private async Task<(string branchName, string branchAddress)> GetBranchInfoAsync(int branchId)
        {
            var b = await _db.branchmaster.AsNoTracking().FirstOrDefaultAsync(x => x.id == branchId);
            return (b?.branchmaster_name ?? "", b?.branchmaster_addressline ?? "");
        }

        private static string FmtMonth(DateTime d) =>
            d.ToString("MMMM yyyy");

        // ── Voucher dropdown ──────────────────────────────────────────────────

        public async Task<List<SalaryVoucherDropdownDTO>> GetVouchersAsync(int branchId, string month)
        {
            DateTime firstOfMonth = DateTime.TryParse(month, out var m) ? m : DateTime.Today;
            firstOfMonth = new DateTime(firstOfMonth.Year, firstOfMonth.Month, 1);

            return await _db.monthlysalary.AsNoTracking()
                .Where(x => x.branchid == branchId && x.salarymonth == firstOfMonth)
                .OrderBy(x => x.id)
                .Select(x => new SalaryVoucherDropdownDTO
                {
                    Id = x.id,
                    Label = $"on Date {x.processdate:dd/MM/yyyy}  Vno = {x.id}",
                    SalaryMonth = x.salarymonth.ToString("yyyy-MM-dd"),
                })
                .ToListAsync();
        }

        // ── PF Statement ──────────────────────────────────────────────────────

        public async Task<PFStatementResponseDTO> GetPFStatementAsync(PFStatementRequestDTO req)
        {
            var (branchName, branchAddress) = await GetBranchInfoAsync(req.BranchId);

            var voucher = await _db.monthlysalary.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.SalaryVoucherId && x.branchid == req.BranchId)
                ?? throw new KeyNotFoundException("Salary voucher not found.");

            // salary register rows for this voucher
            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.monthlysalaryid == req.SalaryVoucherId && x.branchid == req.BranchId)
                .ToListAsync();

            var empIds = empDetails.Select(x => x.empid).ToList();
            var employees = await _db.employeemaster.AsNoTracking()
                .Where(x => empIds.Contains(x.id))
                .ToDictionaryAsync(x => x.id);

            // basic component (lowest seqno, non-deduction) to calculate PF basis
            var basicComp = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.isdeduction == (short)0)
                .OrderBy(x => x.seqno)
                .FirstOrDefaultAsync();

            Dictionary<int, decimal> basicAmts = new();
            if (basicComp != null)
            {
                var compDetails = await _db.monthlysalarycompdetail.AsNoTracking()
                    .Where(x => x.branchid == req.BranchId
                        && empDetails.Select(e => e.id).Contains(x.monthlysalaryempid)
                        && x.compid == basicComp.id)
                    .ToListAsync();

                var empDetailMap = empDetails.ToDictionary(x => x.id, x => x.empid);
                foreach (var cd in compDetails)
                    if (empDetailMap.TryGetValue(cd.monthlysalaryempid, out var eid))
                        basicAmts[eid] = cd.amount;
            }

            // max PF salary from settings
            var settings = await _db.payrollsettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == req.BranchId);
            decimal maxPfSalary = settings?.maxsalaryforpf ?? 15000m;

            var rows = new List<PFStatementRowDTO>();
            int sr = 1;

            foreach (var ed in empDetails.OrderBy(x => x.empid))
            {
                employees.TryGetValue(ed.empid, out var emp);
                basicAmts.TryGetValue(ed.empid, out var basic);

                decimal pfBasis = Math.Min(basic, maxPfSalary);
                decimal share   = Math.Round(pfBasis * 12m / 100m, 2);
                decimal epf     = Math.Round(pfBasis * 3.67m / 100m, 2);
                decimal fpf     = Math.Round(pfBasis * 8.33m / 100m, 2);

                rows.Add(new PFStatementRowDTO
                {
                    SrNo       = sr++,
                    PfAccount  = emp?.pfaccountno ?? "",
                    UanNo      = emp?.uanno ?? "",
                    EmpName    = emp != null ? $"{emp.firstname} {emp.lastname}".Trim() : $"Emp#{ed.empid}",
                    Salary     = ed.totalgross,
                    Share      = share,
                    Epf        = epf,
                    Fpf        = fpf,
                });
            }

            return new PFStatementResponseDTO
            {
                BranchName    = branchName,
                BranchAddress = branchAddress,
                SalaryMonth   = FmtMonth(voucher.salarymonth),
                Rows          = rows,
                TotalSalary   = rows.Sum(r => r.Salary),
                TotalShare    = rows.Sum(r => r.Share),
                TotalEpf      = rows.Sum(r => r.Epf),
                TotalFpf      = rows.Sum(r => r.Fpf),
            };
        }

        // ── ESIC Statement ────────────────────────────────────────────────────

        public async Task<ESICStatementResponseDTO> GetESICStatementAsync(ESICStatementRequestDTO req)
        {
            var (branchName, branchAddress) = await GetBranchInfoAsync(req.BranchId);

            var voucher = await _db.monthlysalary.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.SalaryVoucherId && x.branchid == req.BranchId)
                ?? throw new KeyNotFoundException("Salary voucher not found.");

            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.monthlysalaryid == req.SalaryVoucherId && x.branchid == req.BranchId)
                .ToListAsync();

            var empIds = empDetails.Select(x => x.empid).ToList();
            var employees = await _db.employeemaster.AsNoTracking()
                .Where(x => empIds.Contains(x.id))
                .ToDictionaryAsync(x => x.id);

            var settings = await _db.payrollsettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == req.BranchId);
            decimal esicLimit    = settings?.esiclimit ?? 21000m;
            decimal employerPerc = settings?.employeresicperc ?? 3.25m;
            decimal employeePerc = 0.75m;

            var rows = new List<ESICStatementRowDTO>();
            int sr = 1;

            foreach (var ed in empDetails.OrderBy(x => x.empid))
            {
                employees.TryGetValue(ed.empid, out var emp);

                decimal salary = ed.totalgross;
                decimal empShare = 0, emplShare = 0;

                if (salary <= esicLimit)
                {
                    empShare  = Math.Round(salary * employeePerc / 100m, 2);
                    emplShare = Math.Round(salary * employerPerc / 100m, 2);
                }

                rows.Add(new ESICStatementRowDTO
                {
                    SrNo           = sr++,
                    EsicAccount    = emp?.esicaccountno ?? "",
                    EmpName        = emp != null ? $"{emp.firstname} {emp.lastname}".Trim() : $"Emp#{ed.empid}",
                    Salary         = salary,
                    EmployeeShare  = empShare,
                    EmployerShare  = emplShare,
                    TotalEsic      = empShare + emplShare,
                });
            }

            return new ESICStatementResponseDTO
            {
                BranchName           = branchName,
                BranchAddress        = branchAddress,
                SalaryMonth          = FmtMonth(voucher.salarymonth),
                EsicLimit            = esicLimit,
                Rows                 = rows,
                TotalSalary          = rows.Sum(r => r.Salary),
                TotalEmployeeShare   = rows.Sum(r => r.EmployeeShare),
                TotalEmployerShare   = rows.Sum(r => r.EmployerShare),
                TotalEsic            = rows.Sum(r => r.TotalEsic),
            };
        }

        // ── Salary Register ───────────────────────────────────────────────────

        public async Task<SalaryRegisterResponseDTO> GetSalaryRegisterAsync(SalaryRegisterRequestDTO req)
        {
            var (branchName, branchAddress) = await GetBranchInfoAsync(req.BranchId);

            var voucher = await _db.monthlysalary.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.SalaryVoucherId && x.branchid == req.BranchId)
                ?? throw new KeyNotFoundException("Salary voucher not found.");

            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.monthlysalaryid == req.SalaryVoucherId && x.branchid == req.BranchId)
                .ToListAsync();

            var empDetailIds = empDetails.Select(x => x.id).ToList();
            var compDetails  = await _db.monthlysalarycompdetail.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && empDetailIds.Contains(x.monthlysalaryempid))
                .ToListAsync();

            var empIds = empDetails.Select(x => x.empid).ToList();
            var employees    = await _db.employeemaster.AsNoTracking()
                .Where(x => empIds.Contains(x.id)).ToDictionaryAsync(x => x.id);
            var designations = await _db.employeedesignation.AsNoTracking()
                .Where(x => x.branchid == req.BranchId).ToDictionaryAsync(x => x.id, x => x.description);
            var components   = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId).ToDictionaryAsync(x => x.id);

            // attendance for the salary month
            var firstOfMonth = new DateTime(voucher.salarymonth.Year, voucher.salarymonth.Month, 1);
            var attendance   = await _db.employeeattendance.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.attmonth == firstOfMonth && empIds.Contains(x.empid))
                .ToDictionaryAsync(x => x.empid);

            var settings = await _db.payrollsettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == req.BranchId);
            decimal maxPfSalary = settings?.maxsalaryforpf ?? 15000m;

            // distinct component lists
            var allCompIds = compDetails.Select(x => x.compid).Distinct().ToList();
            var earningComps   = components.Values.Where(c => allCompIds.Contains(c.id) && c.isdeduction == (short)0)
                .OrderBy(c => c.seqno).Select(c => new ComponentAmountDTO { CompId = c.id, CompName = c.description, CompAlias = c.alias }).ToList();
            var deductionComps = components.Values.Where(c => allCompIds.Contains(c.id) && c.isdeduction == (short)1)
                .OrderBy(c => c.seqno).Select(c => new ComponentAmountDTO { CompId = c.id, CompName = c.description, CompAlias = c.alias }).ToList();

            var rows = new List<SalaryRegisterRowDTO>();
            int sr = 1;
            decimal totalPfBasis = 0;

            foreach (var ed in empDetails.OrderBy(x => x.empid))
            {
                employees.TryGetValue(ed.empid, out var emp);
                attendance.TryGetValue(ed.empid, out var att);
                designations.TryGetValue(emp?.designationid ?? 0, out var desig);

                var myComps = compDetails.Where(c => c.monthlysalaryempid == ed.id)
                    .ToDictionary(c => c.compid, c => c.amount);

                var basicComp = earningComps.FirstOrDefault();
                decimal basicAmt = basicComp != null && myComps.TryGetValue(basicComp.CompId, out var ba) ? ba : 0;
                totalPfBasis += Math.Min(basicAmt, maxPfSalary);

                rows.Add(new SalaryRegisterRowDTO
                {
                    SrNo         = sr++,
                    EmpId        = ed.empid,
                    EmpName      = emp != null ? $"{emp.firstname} {emp.lastname}".Trim() : $"Emp#{ed.empid}",
                    Designation  = desig ?? "",
                    Days         = att?.atttype == 1 ? (decimal)(DateTime.DaysInMonth(firstOfMonth.Year, firstOfMonth.Month)) : 26,
                    El           = att?.el ?? 0,
                    Cl           = att?.cl ?? 0,
                    Sl           = att?.mlsl ?? 0,
                    Lwp          = att?.lwp ?? 0,
                    TotalGross   = ed.totalgross,
                    TotalDeduction = ed.totaldeduction,
                    NetPay       = ed.netpay,
                    Earnings     = earningComps.Select(c => new ComponentAmountDTO
                    {
                        CompId = c.CompId, CompName = c.CompName, CompAlias = c.CompAlias,
                        Amount = myComps.TryGetValue(c.CompId, out var a) ? a : 0
                    }).ToList(),
                    Deductions   = deductionComps.Select(c => new ComponentAmountDTO
                    {
                        CompId = c.CompId, CompName = c.CompName, CompAlias = c.CompAlias,
                        Amount = myComps.TryGetValue(c.CompId, out var a) ? a : 0
                    }).ToList(),
                });
            }

            decimal epf   = Math.Round(totalPfBasis * 3.67m / 100m, 2);
            decimal fpf   = Math.Round(totalPfBasis * 8.33m / 100m, 2);
            decimal admn  = Math.Round(totalPfBasis * 1.10m / 100m, 2);
            decimal edli  = Math.Round(totalPfBasis * 0.50m / 100m, 2);
            decimal ac22  = Math.Round(totalPfBasis * 0.01m / 100m, 2);
            decimal totalGross = rows.Sum(r => r.TotalGross);

            return new SalaryRegisterResponseDTO
            {
                BranchName          = branchName,
                BranchAddress       = branchAddress,
                SalaryMonth         = FmtMonth(voucher.salarymonth),
                EarningComponents   = earningComps,
                DeductionComponents = deductionComps,
                Rows                = rows,
                TotalGross          = totalGross,
                TotalDeduction      = rows.Sum(r => r.TotalDeduction),
                TotalNetPay         = rows.Sum(r => r.NetPay),
                EpfAmount           = epf,
                FpfAmount           = fpf,
                AdmnAmount          = admn,
                EdliAmount          = edli,
                Ac22Amount          = ac22,
                SanctionedTotal     = totalGross + fpf + admn + edli + ac22,
            };
        }

        // ── Employee Salary Statement ─────────────────────────────────────────

        public async Task<EmpSalaryStatementResponseDTO> GetEmpSalaryStatementAsync(EmpSalaryStatementRequestDTO req)
        {
            var (branchName, branchAddress) = await GetBranchInfoAsync(req.BranchId);

            var emp = await _db.employeemaster.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.EmpId && x.branchid == req.BranchId)
                ?? throw new KeyNotFoundException("Employee not found.");

            var desig = await _db.employeedesignation.AsNoTracking()
                .Where(x => x.id == emp.designationid && x.branchid == req.BranchId)
                .Select(x => x.description).FirstOrDefaultAsync() ?? "";

            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.empid == req.EmpId)
                .OrderBy(x => x.id)
                .ToListAsync();

            var empDetailIds = empDetails.Select(x => x.id).ToList();
            var compDetails  = await _db.monthlysalarycompdetail.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && empDetailIds.Contains(x.monthlysalaryempid))
                .ToListAsync();

            var salaryVoucherIds = empDetails.Select(x => x.monthlysalaryid).Distinct().ToList();
            var vouchers = await _db.monthlysalary.AsNoTracking()
                .Where(x => salaryVoucherIds.Contains(x.id))
                .ToDictionaryAsync(x => x.id);

            var components = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId)
                .OrderBy(x => x.seqno)
                .ToListAsync();

            var allComponents = components.Select(c => new ComponentAmountDTO
            {
                CompId = c.id, CompName = c.description, CompAlias = c.alias
            }).ToList();

            var rows = empDetails.Select(ed =>
            {
                vouchers.TryGetValue(ed.monthlysalaryid, out var v);
                var myComps = compDetails.Where(c => c.monthlysalaryempid == ed.id)
                    .ToDictionary(c => c.compid, c => c.amount);

                return new EmpSalaryStatementRowDTO
                {
                    SalaryMonth    = v != null ? FmtMonth(v.salarymonth) : "",
                    TotalGross     = ed.totalgross,
                    TotalDeduction = ed.totaldeduction,
                    NetPay         = ed.netpay,
                    Components     = components.Select(c => new ComponentAmountDTO
                    {
                        CompId = c.id, CompName = c.description, CompAlias = c.alias,
                        Amount = myComps.TryGetValue(c.id, out var a) ? a : 0
                    }).ToList(),
                };
            }).ToList();

            return new EmpSalaryStatementResponseDTO
            {
                EmpName       = $"{emp.firstname} {emp.lastname}".Trim(),
                EmpCode       = emp.code,
                Designation   = desig,
                BranchName    = branchName,
                BranchAddress = branchAddress,
                AllComponents = allComponents,
                Rows          = rows,
            };
        }

        // ── Arrear Report ─────────────────────────────────────────────────────

        public async Task<ArrearReportResponseDTO> GetArrearReportAsync(ArrearReportRequestDTO req)
        {
            var (branchName, _) = await GetBranchInfoAsync(req.BranchId);

            if (!DateTime.TryParse(req.FromMonth, out var fromDt))
                throw new ArgumentException("Invalid FromMonth.");
            if (!DateTime.TryParse(req.ToMonth, out var toDt))
                throw new ArgumentException("Invalid ToMonth.");

            var firstOfFrom = new DateTime(fromDt.Year, fromDt.Month, 1);
            var firstOfTo   = new DateTime(toDt.Year, toDt.Month, 1);

            // components to check
            var components = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId
                    && (req.CompIds.Count == 0 || req.CompIds.Contains(x.id)))
                .OrderBy(x => x.seqno)
                .ToListAsync();

            // employees
            var empQuery = _db.employeemaster.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.status == 1);
            if (req.EmpId.HasValue)
                empQuery = empQuery.Where(x => x.id == req.EmpId.Value);
            var employees = await empQuery.OrderBy(x => x.firstname).ToListAsync();

            // current component amounts (SalaryCompEmpWise — latest per employee)
            var allCurrentAmts = await _db.salarycompempwise.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.date <= firstOfTo)
                .ToListAsync();

            // monthly salary vouchers in range
            var vouchers = await _db.monthlysalary.AsNoTracking()
                .Where(x => x.branchid == req.BranchId
                    && x.salarymonth >= firstOfFrom && x.salarymonth <= firstOfTo)
                .ToListAsync();

            var voucherIds = vouchers.Select(v => v.id).ToList();
            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && voucherIds.Contains(x.monthlysalaryid))
                .ToListAsync();

            var empDetailIds = empDetails.Select(x => x.id).ToList();
            var compDetails  = await _db.monthlysalarycompdetail.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && empDetailIds.Contains(x.monthlysalaryempid))
                .ToListAsync();

            var rows = new List<ArrearRowDTO>();
            int sr = 1;

            foreach (var emp in employees)
            {
                foreach (var v in vouchers.OrderBy(x => x.salarymonth))
                {
                    var ed = empDetails.FirstOrDefault(e => e.monthlysalaryid == v.id && e.empid == emp.id);
                    if (ed == null) continue;

                    var myComps = compDetails.Where(c => c.monthlysalaryempid == ed.id)
                        .ToDictionary(c => c.compid, c => c.amount);

                    foreach (var comp in components)
                    {
                        // "due" = latest component amount on/before this salary month
                        decimal due = allCurrentAmts
                            .Where(x => x.empid == emp.id && x.compid == comp.id && x.date <= v.salarymonth)
                            .OrderByDescending(x => x.date)
                            .Select(x => x.amount)
                            .FirstOrDefault();

                        decimal drawn  = myComps.TryGetValue(comp.id, out var d) ? d : 0;
                        decimal arrear = due - drawn;

                        if (arrear == 0) continue;

                        rows.Add(new ArrearRowDTO
                        {
                            SrNo        = sr++,
                            EmpName     = $"{emp.firstname} {emp.lastname}".Trim(),
                            SalaryMonth = FmtMonth(v.salarymonth),
                            CompName    = comp.description,
                            Due         = due,
                            Drawn       = drawn,
                            Arrear      = arrear,
                        });
                    }
                }
            }

            return new ArrearReportResponseDTO
            {
                BranchName  = branchName,
                FromMonth   = FmtMonth(firstOfFrom),
                ToMonth     = FmtMonth(firstOfTo),
                Rows        = rows,
                TotalDue    = rows.Sum(r => r.Due),
                TotalDrawn  = rows.Sum(r => r.Drawn),
                TotalArrear = rows.Sum(r => r.Arrear),
            };
        }

        // ── Salary Challan ────────────────────────────────────────────────────

        public async Task<SalaryChallanResponseDTO> GetSalaryChallanAsync(SalaryChallanRequestDTO req)
        {
            var (branchName, branchAddress) = await GetBranchInfoAsync(req.BranchId);

            var voucher = await _db.monthlysalary.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.SalaryVoucherId && x.branchid == req.BranchId)
                ?? throw new KeyNotFoundException("Salary voucher not found.");

            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.monthlysalaryid == req.SalaryVoucherId && x.branchid == req.BranchId)
                .ToListAsync();

            var empDetailIds = empDetails.Select(x => x.id).ToList();
            var compDetails  = await _db.monthlysalarycompdetail.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && empDetailIds.Contains(x.monthlysalaryempid))
                .ToListAsync();

            var empIds    = empDetails.Select(x => x.empid).ToList();
            var employees = await _db.employeemaster.AsNoTracking()
                .Where(x => empIds.Contains(x.id)).ToDictionaryAsync(x => x.id);
            var designations = await _db.employeedesignation.AsNoTracking()
                .Where(x => x.branchid == req.BranchId).ToDictionaryAsync(x => x.id, x => x.description);
            var components = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId).ToDictionaryAsync(x => x.id);

            var allCompIds = compDetails.Select(x => x.compid).Distinct().ToList();
            var earningComps   = components.Values.Where(c => allCompIds.Contains(c.id) && c.isdeduction == (short)0)
                .OrderBy(c => c.seqno).Select(c => new ComponentAmountDTO { CompId = c.id, CompName = c.description, CompAlias = c.alias }).ToList();
            var deductionComps = components.Values.Where(c => allCompIds.Contains(c.id) && c.isdeduction == (short)1)
                .OrderBy(c => c.seqno).Select(c => new ComponentAmountDTO { CompId = c.id, CompName = c.description, CompAlias = c.alias }).ToList();

            // saving account numbers for salary payment
            var accIds = employees.Values.Where(e => e.savingaccountid > 0).Select(e => e.savingaccountid).Distinct().ToList();
            var accNos = await _db.accountmaster.AsNoTracking()
                .Where(x => accIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => x.AccountNumber);

            var rows = new List<SalaryChallanRowDTO>();
            int sr = 1;

            foreach (var ed in empDetails.OrderBy(x => x.empid))
            {
                employees.TryGetValue(ed.empid, out var emp);
                designations.TryGetValue(emp?.designationid ?? 0, out var desig);
                var myComps = compDetails.Where(c => c.monthlysalaryempid == ed.id).ToDictionary(c => c.compid, c => c.amount);
                var accNo   = emp != null && accNos.TryGetValue(emp.savingaccountid, out var an) ? an : "";

                rows.Add(new SalaryChallanRowDTO
                {
                    SrNo           = sr++,
                    EmpName        = emp != null ? $"{emp.firstname} {emp.lastname}".Trim() : $"Emp#{ed.empid}",
                    Designation    = desig ?? "",
                    AccountNo      = accNo,
                    TotalGross     = ed.totalgross,
                    TotalDeduction = ed.totaldeduction,
                    NetPay         = ed.netpay,
                    Earnings       = earningComps.Select(c => new ComponentAmountDTO
                    {
                        CompId = c.CompId, CompName = c.CompName, CompAlias = c.CompAlias,
                        Amount = myComps.TryGetValue(c.CompId, out var a) ? a : 0
                    }).ToList(),
                    Deductions     = deductionComps.Select(c => new ComponentAmountDTO
                    {
                        CompId = c.CompId, CompName = c.CompName, CompAlias = c.CompAlias,
                        Amount = myComps.TryGetValue(c.CompId, out var a) ? a : 0
                    }).ToList(),
                });
            }

            return new SalaryChallanResponseDTO
            {
                BranchName          = branchName,
                BranchAddress       = branchAddress,
                SalaryMonth         = FmtMonth(voucher.salarymonth),
                EarningComponents   = earningComps,
                DeductionComponents = deductionComps,
                Rows                = rows,
                TotalGross          = rows.Sum(r => r.TotalGross),
                TotalDeduction      = rows.Sum(r => r.TotalDeduction),
                TotalNetPay         = rows.Sum(r => r.NetPay),
            };
        }

        // ── Loan Recovery Detail ──────────────────────────────────────────────

        public async Task<LoanRecoveryDetailResponseDTO> GetLoanRecoveryDetailAsync(LoanRecoveryDetailRequestDTO req)
        {
            var (branchName, branchAddress) = await GetBranchInfoAsync(req.BranchId);

            var voucher = await _db.monthlysalary.AsNoTracking()
                .FirstOrDefaultAsync(x => x.id == req.SalaryVoucherId && x.branchid == req.BranchId)
                ?? throw new KeyNotFoundException("Salary voucher not found.");

            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.monthlysalaryid == req.SalaryVoucherId && x.branchid == req.BranchId)
                .ToListAsync();

            var empDetailIds = empDetails.Select(x => x.id).ToList();
            var compDetails  = await _db.monthlysalarycompdetail.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && empDetailIds.Contains(x.monthlysalaryempid) && x.isdeduction == (short)1)
                .ToListAsync();

            var empIds    = empDetails.Select(x => x.empid).ToList();
            var employees = await _db.employeemaster.AsNoTracking()
                .Where(x => empIds.Contains(x.id)).ToDictionaryAsync(x => x.id);
            var designations = await _db.employeedesignation.AsNoTracking()
                .Where(x => x.branchid == req.BranchId).ToDictionaryAsync(x => x.id, x => x.description);
            var components = await _db.salarycomponent.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.isdeduction == (short)1)
                .OrderBy(x => x.seqno).ToListAsync();

            var allCompIds = compDetails.Select(x => x.compid).Distinct().ToList();
            var dedComps   = components.Where(c => allCompIds.Contains(c.id))
                .Select(c => new ComponentAmountHeader { CompId = c.id, CompAlias = c.alias }).ToList();

            var rows = new List<LoanRecoveryDetailRowDTO>();
            int sr = 1;

            foreach (var ed in empDetails.OrderBy(x => x.empid))
            {
                employees.TryGetValue(ed.empid, out var emp);
                designations.TryGetValue(emp?.designationid ?? 0, out var desig);

                var myDeds = compDetails.Where(c => c.monthlysalaryempid == ed.id)
                    .ToDictionary(c => c.compid, c => c.amount);
                if (myDeds.Count == 0) continue;

                var dedList = dedComps.Select(c => new ComponentAmountDTO
                {
                    CompId    = c.CompId,
                    CompName  = components.FirstOrDefault(x => x.id == c.CompId)?.description ?? c.CompAlias,
                    CompAlias = c.CompAlias,
                    Amount    = myDeds.TryGetValue(c.CompId, out var a) ? a : 0,
                }).ToList();

                rows.Add(new LoanRecoveryDetailRowDTO
                {
                    SrNo           = sr++,
                    EmpName        = emp != null ? $"{emp.firstname} {emp.lastname}".Trim() : $"Emp#{ed.empid}",
                    Designation    = desig ?? "",
                    Deductions     = dedList,
                    TotalDeduction = myDeds.Values.Sum(),
                });
            }

            return new LoanRecoveryDetailResponseDTO
            {
                BranchName          = branchName,
                BranchAddress       = branchAddress,
                SalaryMonth         = FmtMonth(voucher.salarymonth),
                DeductionComponents = dedComps,
                Rows                = rows,
                TotalDeduction      = rows.Sum(r => r.TotalDeduction),
            };
        }

        // ── Salary Voucher List ───────────────────────────────────────────────

        public async Task<SalaryVoucherListResponseDTO> GetSalaryVoucherListAsync(int branchId)
        {
            var (branchName, _) = await GetBranchInfoAsync(branchId);

            var vouchers = await _db.monthlysalary.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .OrderByDescending(x => x.salarymonth)
                .ToListAsync();

            var vIds = vouchers.Select(v => v.id).ToList();
            var empDetails = await _db.monthlysalaryempdetail.AsNoTracking()
                .Where(x => x.branchid == branchId && vIds.Contains(x.monthlysalaryid))
                .ToListAsync();

            var rows = new List<SalaryVoucherListRowDTO>();
            int sr = 1;
            foreach (var v in vouchers)
            {
                var myEds = empDetails.Where(e => e.monthlysalaryid == v.id).ToList();
                rows.Add(new SalaryVoucherListRowDTO
                {
                    SrNo           = sr++,
                    VoucherId      = v.id,
                    SalaryMonth    = FmtMonth(v.salarymonth),
                    ProcessDate    = v.processdate.ToString("dd/MM/yyyy"),
                    EmployeeCount  = myEds.Count,
                    TotalGross     = myEds.Sum(e => e.totalgross),
                    TotalDeduction = myEds.Sum(e => e.totaldeduction),
                    TotalNetPay    = myEds.Sum(e => e.netpay),
                });
            }

            return new SalaryVoucherListResponseDTO { BranchName = branchName, Rows = rows };
        }

        // ── Delete Salary ─────────────────────────────────────────────────────

        public async Task<string> DeleteSalaryVoucherAsync(DeleteSalaryRequestDTO req)
        {
            var voucher = await _db.monthlysalary.FirstOrDefaultAsync(x =>
                x.id == req.SalaryVoucherId && x.branchid == req.BranchId)
                ?? throw new KeyNotFoundException("Salary voucher not found.");

            // Hierarchy check: cannot delete if a later-month salary exists for this branch
            var laterVouchers = await _db.monthlysalary.AsNoTracking()
                .Where(x => x.branchid == req.BranchId && x.salarymonth > voucher.salarymonth)
                .OrderBy(x => x.salarymonth)
                .Select(x => x.salarymonth)
                .ToListAsync();

            if (laterVouchers.Count > 0)
            {
                var monthNames = string.Join(", ", laterVouchers.Select(m => m.ToString("MMMM yyyy")));
                throw new InvalidOperationException(
                    $"Cannot delete this voucher. Please delete later months first: {monthNames}.");
            }

            var empDetails   = await _db.monthlysalaryempdetail
                .Where(x => x.monthlysalaryid == voucher.id && x.branchid == req.BranchId)
                .ToListAsync();

            var empDetailIds = empDetails.Select(x => x.id).ToList();
            var compDetails  = await _db.monthlysalarycompdetail
                .Where(x => empDetailIds.Contains(x.monthlysalaryempid) && x.branchid == req.BranchId)
                .ToListAsync();

            _db.monthlysalarycompdetail.RemoveRange(compDetails);
            _db.monthlysalaryempdetail.RemoveRange(empDetails);
            _db.monthlysalary.Remove(voucher);
            await _db.SaveChangesAsync();

            return $"Salary voucher #{req.SalaryVoucherId} deleted successfully.";
        }

        // ── Posted Months ─────────────────────────────────────────────────────

        public async Task<List<string>> GetPostedMonthsAsync(int branchId)
        {
            var months = await _db.monthlysalary.AsNoTracking()
                .Where(x => x.branchid == branchId)
                .Select(x => x.salarymonth)
                .ToListAsync();

            return months
                .Select(m => $"{m.Year}-{m.Month:D2}-01")
                .Distinct()
                .ToList();
        }
    }
}
