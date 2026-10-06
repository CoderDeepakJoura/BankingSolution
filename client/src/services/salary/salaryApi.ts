import { ApiService } from '../api';

export interface EmployeeDesignation {
  id: number;
  branchId: number;
  alias: string;
  description: string;
  empGradeId: number;
}

export interface EmployeeLeaveAllotment {
  id: number;
  employeeId: number;
  branchId: number;
  leaveType: string;
  noOfDays: number;
  allotmentDate: string;
}

export interface EmployeeMaster {
  id: number;
  branchId: number;
  code: string;
  firstName: string;
  lastName?: string;
  relativeName?: string;
  relation?: string;
  station?: string;
  genderId: number;
  maritalStatus: number;
  phone?: string;
  address?: string;
  hoAcNo?: string;
  designationId: number;
  designationName?: string;
  empType: number;
  joiningDate: string;
  dob?: string;
  emailId?: string;
  isLeave: boolean;
  leaveDate?: string;
  status: number;
  remarks?: string;
  // payroll
  pfAccountNo?: string;
  uanNo?: string;
  esicAccountNo?: string;
  lastIncrementDate?: string;
  savingAccountId: number;
  savingAccountName?: string;
  educationQual: string[];
  leaveAllotments: EmployeeLeaveAllotment[];
}

export interface SalaryComponent {
  id: number;
  branchId: number;
  alias: string;
  description: string;
  seqNo: number;
  type: number;
  isEditable: number;
  defineAmount: number;
  isAllowance: number;
  isDeduction: number;
  accId?: number;
}

export interface SalaryComponentLine {
  componentId: number;
  name: string;
  isActive: number;
  amount: number;
  accId?: number;
  componentType: number;
  isDeduction: number;
}

export interface SalaryCreationData {
  empId: number;
  employeeName: string;
  designationName: string;
  empType: number;
  daysInMonth: number;
  components: SalaryComponentLine[];
}

export interface SalaryFilter {
  searchTerm: string;
  pageNumber: number;
  pageSize: number;
}

export interface AttendanceRow {
  id: number;
  empId: number;
  empCode: string;
  empName: string;
  designationName: string;
  el: number;
  cl: number;
  mlsl: number;
  lwp: number;
  remarks: string;
}

export interface SaveAttendanceDto {
  branchId: number;
  attMonth: string; // "YYYY-MM-01"
  attType: number;
  rows: Array<{
    empId: number;
    el: number;
    cl: number;
    mlsl: number;
    lwp: number;
    remarks: string;
  }>;
}

export interface BonusReportRequestDTO {
  branchId: number;
  fromDate: string;
  toDate: string;
  days: number;
}

export interface BonusReportRow {
  srNo: number;
  empId: number;
  empName: string;
  designation: string;
  leaveCount: number;
  bonusDays: number;
  basicSalary: number;
  bonus: number;
}

export interface BonusReportResponse {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  days: number;
  totalBonus: number;
  rows: BonusReportRow[];
}

// ── EmpGrade ──────────────────────────────────────────────────────────────────
export interface EmpGrade {
  id: number; branchId: number; code: string; description: string;
}

// ── PayrollSettings ───────────────────────────────────────────────────────────
export interface PayrollSettingsDTO {
  id: number; branchId: number;
  salaryAccId: number; salaryAccName: string;
  startDayOfMonth: number; daysInMonth: number;
  cpfHeadCode: string; rdHeadCode: string;
  maxSalaryForPf: number; extraEmployeePf: boolean; extraEmployerPf: boolean;
  maxFpf: number; employeresicPerc: number; esicLimit: number;
  loanProductIds: number[];
}

// ── Salary Voucher Dropdown ───────────────────────────────────────────────────
export interface SalaryVoucherDropdown {
  id: number; label: string; salaryMonth: string;
}

// ── Component Amount ──────────────────────────────────────────────────────────
export interface ComponentAmount {
  compId: number; compName: string; compAlias: string; amount: number;
}

// ── PF Statement ──────────────────────────────────────────────────────────────
export interface PFStatementRow {
  srNo: number; pfAccount: string; uanNo: string; empName: string;
  salary: number; share: number; epf: number; fpf: number;
}
export interface PFStatementResponse {
  branchName: string; branchAddress: string; salaryMonth: string;
  rows: PFStatementRow[];
  totalSalary: number; totalShare: number; totalEpf: number; totalFpf: number;
}

// ── ESIC Statement ────────────────────────────────────────────────────────────
export interface ESICStatementRow {
  srNo: number; esicAccount: string; empName: string; salary: number;
  employeeShare: number; employerShare: number; totalEsic: number;
}
export interface ESICStatementResponse {
  branchName: string; branchAddress: string; salaryMonth: string; esicLimit: number;
  rows: ESICStatementRow[];
  totalSalary: number; totalEmployeeShare: number; totalEmployerShare: number; totalEsic: number;
}

// ── Salary Register ───────────────────────────────────────────────────────────
export interface SalaryRegisterRow {
  srNo: number; empId: number; empName: string; designation: string;
  days: number; el: number; cl: number; sl: number; lwp: number;
  totalGross: number; totalDeduction: number; netPay: number;
  earnings: ComponentAmount[]; deductions: ComponentAmount[];
}
export interface SalaryRegisterResponse {
  branchName: string; branchAddress: string; salaryMonth: string;
  earningComponents: ComponentAmount[]; deductionComponents: ComponentAmount[];
  rows: SalaryRegisterRow[];
  totalGross: number; totalDeduction: number; totalNetPay: number;
  epfPerc: number; fpfPerc: number; admnPerc: number; edliPerc: number; ac22Perc: number;
  epfAmount: number; fpfAmount: number; admnAmount: number; edliAmount: number; ac22Amount: number;
  sanctionedTotal: number;
}

// ── Employee Salary Statement ─────────────────────────────────────────────────
export interface EmpSalaryStatementRow {
  salaryMonth: string; totalGross: number; totalDeduction: number; netPay: number;
  components: ComponentAmount[];
}
export interface EmpSalaryStatementResponse {
  empName: string; empCode: string; designation: string;
  branchName: string; branchAddress: string;
  allComponents: ComponentAmount[];
  rows: EmpSalaryStatementRow[];
}

// ── Arrear Report ─────────────────────────────────────────────────────────────
export interface ArrearRow {
  srNo: number; empName: string; salaryMonth: string; compName: string;
  due: number; drawn: number; arrear: number;
}
export interface ArrearReportResponse {
  branchName: string; fromMonth: string; toMonth: string;
  rows: ArrearRow[];
  totalDue: number; totalDrawn: number; totalArrear: number;
}

// ── Salary Challan ────────────────────────────────────────────────────────────
export interface SalaryChallanRow {
  srNo: number; empName: string; designation: string; accountNo: string;
  totalGross: number; totalDeduction: number; netPay: number;
  earnings: ComponentAmount[]; deductions: ComponentAmount[];
}
export interface SalaryChallanResponse {
  branchName: string; branchAddress: string; salaryMonth: string;
  earningComponents: ComponentAmount[]; deductionComponents: ComponentAmount[];
  rows: SalaryChallanRow[];
  totalGross: number; totalDeduction: number; totalNetPay: number;
}

class SalaryApiService extends ApiService {
  constructor() { super(); }

  // ── Employee Designation ──────────────────────────────────────────
  getDesignations(branchId: number, filter: SalaryFilter) {
    return this.makeRequest<{ success: boolean; items: EmployeeDesignation[]; totalCount: number }>(
      `/EmployeeDesignation/get-all/${branchId}`,
      { method: 'POST', body: JSON.stringify(filter) }
    );
  }

  getDesignationDropdown(branchId: number) {
    return this.makeRequest<{ success: boolean; items: EmployeeDesignation[] }>(
      `/EmployeeDesignation/dropdown/${branchId}`,
      { method: 'GET' }
    );
  }

  createDesignation(data: Partial<EmployeeDesignation>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeDesignation`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  updateDesignation(data: Partial<EmployeeDesignation>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeDesignation`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  deleteDesignation(id: number, branchId: number) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeDesignation/${id}/${branchId}`,
      { method: 'DELETE' }
    );
  }

  // ── Employee Master ───────────────────────────────────────────────
  getEmployees(branchId: number, filter: SalaryFilter) {
    return this.makeRequest<{ success: boolean; items: EmployeeMaster[]; totalCount: number }>(
      `/EmployeeMaster/get-all/${branchId}`,
      { method: 'POST', body: JSON.stringify(filter) }
    );
  }

  getEmployeeById(id: number, branchId: number) {
    return this.makeRequest<{ success: boolean; data: EmployeeMaster }>(
      `/EmployeeMaster/${id}/${branchId}`,
      { method: 'GET' }
    );
  }

  getEmployeeDropdown(branchId: number) {
    return this.makeRequest<{ success: boolean; items: EmployeeMaster[] }>(
      `/EmployeeMaster/dropdown/${branchId}`,
      { method: 'GET' }
    );
  }

  createEmployee(data: Partial<EmployeeMaster>) {
    return this.makeRequest<{ success: boolean; message: string; empId: number }>(
      `/EmployeeMaster`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  saveEmployeePayroll(data: Partial<EmployeeMaster>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeMaster/save-payroll`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  updateEmployee(data: Partial<EmployeeMaster>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeMaster`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  deleteEmployee(id: number, branchId: number) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeMaster/${id}/${branchId}`,
      { method: 'DELETE' }
    );
  }

  // ── Salary Component ──────────────────────────────────────────────
  getSalaryComponents(branchId: number, filter: SalaryFilter) {
    return this.makeRequest<{ success: boolean; items: SalaryComponent[]; totalCount: number }>(
      `/SalaryComponent/get-all/${branchId}`,
      { method: 'POST', body: JSON.stringify(filter) }
    );
  }

  getSalaryComponentDropdown(branchId: number) {
    return this.makeRequest<{ success: boolean; items: SalaryComponent[] }>(
      `/SalaryComponent/dropdown/${branchId}`,
      { method: 'GET' }
    );
  }

  createSalaryComponent(data: Partial<SalaryComponent>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/SalaryComponent`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  updateSalaryComponent(data: Partial<SalaryComponent>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/SalaryComponent`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  deleteSalaryComponent(id: number, branchId: number) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/SalaryComponent/${id}/${branchId}`,
      { method: 'DELETE' }
    );
  }

  // ── Salary Creation ───────────────────────────────────────────────
  fetchEmployeeSalary(req: {
    branchId: number; empId: number;
    salaryDate: string; dateFrom: string; dateTo: string;
  }) {
    return this.makeRequest<{ success: boolean; data: SalaryCreationData }>(
      `/SalaryCreation/fetch-employee-salary`,
      { method: 'POST', body: JSON.stringify(req) }
    );
  }

  // ── Employee Attendance ───────────────────────────────────────────
  getAttendance(branchId: number, month: string) {
    return this.makeRequest<{ success: boolean; items: AttendanceRow[] }>(
      `/EmployeeAttendance/get/${branchId}?month=${month}`,
      { method: 'GET' }
    );
  }

  saveAttendance(dto: SaveAttendanceDto) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeAttendance/save`,
      { method: 'POST', body: JSON.stringify(dto) }
    );
  }

  saveMonthlySalary(dto: {
    branchId: number; sessionId: number; processedBy: number; salaryMonth: string;
    employees: Array<{
      empId: number; totalGross: number; totalDeduction: number; netPay: number;
      components: Array<{ compId: number; amount: number; isDeduction: number }>;
    }>;
  }) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/SalaryCreation/save`,
      { method: 'POST', body: JSON.stringify(dto) }
    );
  }

  getBonusReport(dto: BonusReportRequestDTO) {
    return this.makeRequest<BonusReportResponse>(
      `/SalaryReport/bonus-report`,
      { method: 'POST', body: JSON.stringify(dto) }
    );
  }

  // ── EmpGrade ──────────────────────────────────────────────────────────────
  getEmpGrades(branchId: number, filter: SalaryFilter) {
    return this.makeRequest<{ success: boolean; items: EmpGrade[]; totalCount: number }>(
      `/EmpGrade/get-all/${branchId}`,
      { method: 'POST', body: JSON.stringify(filter) }
    );
  }
  getEmpGradeDropdown(branchId: number) {
    return this.makeRequest<{ success: boolean; items: EmpGrade[] }>(
      `/EmpGrade/dropdown/${branchId}`, { method: 'GET' }
    );
  }
  createEmpGrade(data: Partial<EmpGrade>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmpGrade`, { method: 'POST', body: JSON.stringify(data) }
    );
  }
  updateEmpGrade(data: Partial<EmpGrade>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmpGrade`, { method: 'PUT', body: JSON.stringify(data) }
    );
  }
  deleteEmpGrade(id: number, branchId: number) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmpGrade/${id}/${branchId}`, { method: 'DELETE' }
    );
  }

  // ── Payroll Settings ───────────────────────────────────────────────────────
  getPayrollSettings(branchId: number) {
    return this.makeRequest<PayrollSettingsDTO>(
      `/PayrollSettings/${branchId}`, { method: 'GET' }
    );
  }
  savePayrollSettings(dto: PayrollSettingsDTO) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/PayrollSettings`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }

  // ── Salary Reports ─────────────────────────────────────────────────────────
  getSalaryVouchers(branchId: number, month: string) {
    return this.makeRequest<{ success: boolean; items: SalaryVoucherDropdown[] }>(
      `/SalaryReport/salary-vouchers/${branchId}?month=${month}`, { method: 'GET' }
    );
  }
  getPFStatement(dto: { branchId: number; salaryVoucherId: number }) {
    return this.makeRequest<PFStatementResponse>(
      `/SalaryReport/pf-statement`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
  getESICStatement(dto: { branchId: number; salaryVoucherId: number }) {
    return this.makeRequest<ESICStatementResponse>(
      `/SalaryReport/esic-statement`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
  getSalaryRegister(dto: { branchId: number; salaryVoucherId: number }) {
    return this.makeRequest<SalaryRegisterResponse>(
      `/SalaryReport/salary-register`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
  getEmpSalaryStatement(dto: { branchId: number; empId: number }) {
    return this.makeRequest<EmpSalaryStatementResponse>(
      `/SalaryReport/emp-salary-statement`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
  getArrearReport(dto: { branchId: number; fromMonth: string; toMonth: string; empId?: number; compIds: number[] }) {
    return this.makeRequest<ArrearReportResponse>(
      `/SalaryReport/arrear-report`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
  getSalaryChallan(dto: { branchId: number; salaryVoucherId: number }) {
    return this.makeRequest<SalaryChallanResponse>(
      `/SalaryReport/salary-challan`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
  deleteSalaryVoucher(dto: { branchId: number; salaryVoucherId: number }) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/SalaryReport/delete-salary`, { method: 'DELETE', body: JSON.stringify(dto) }
    );
  }
  getLoanRecoveryDetail(dto: { branchId: number; salaryVoucherId: number }) {
    return this.makeRequest<LoanRecoveryDetailResponse>(
      `/SalaryReport/loan-recovery-detail`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
  getSalaryVoucherList(branchId: number) {
    return this.makeRequest<SalaryVoucherListResponse>(
      `/SalaryReport/salary-voucher-list/${branchId}`, { method: 'GET' }
    );
  }
  getPostedSalaryMonths(branchId: number) {
    return this.makeRequest<{ success: boolean; months: string[] }>(
      `/SalaryReport/posted-months/${branchId}`, { method: 'GET' }
    );
  }
  transferEmployee(dto: { empId: number; fromBranchId: number; toBranchId: number; transferDate: string; remarks: string }) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeTransfer`, { method: 'POST', body: JSON.stringify(dto) }
    );
  }
}

// ── Loan Recovery Detail Report ───────────────────────────────────────────────
export interface LoanRecoveryDetailRow {
  srNo: number; empName: string; designation: string;
  deductions: { compId: number; compName: string; compAlias: string; amount: number }[];
  totalDeduction: number;
}
export interface LoanRecoveryDetailResponse {
  branchName: string; branchAddress: string; salaryMonth: string;
  deductionComponents: { compId: number; compAlias: string }[];
  rows: LoanRecoveryDetailRow[];
  totalDeduction: number;
}

// ── Salary Voucher List ───────────────────────────────────────────────────────
export interface SalaryVoucherListRow {
  srNo: number; voucherId: number; salaryMonth: string; processDate: string;
  employeeCount: number; totalGross: number; totalDeduction: number; totalNetPay: number;
}
export interface SalaryVoucherListResponse {
  branchName: string;
  rows: SalaryVoucherListRow[];
}

export default new SalaryApiService();
