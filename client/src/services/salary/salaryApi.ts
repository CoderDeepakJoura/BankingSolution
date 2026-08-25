import { ApiService } from '../api';

export interface EmployeeDesignation {
  id: number;
  branchId: number;
  alias: string;
  description: string;
  empGradeId: number;
}

export interface EmployeeMaster {
  id: number;
  branchId: number;
  code: string;
  firstName: string;
  lastName?: string;
  designationId: number;
  designationName?: string;
  empType: number;
  genderId: number;
  dob?: string;
  phone?: string;
  address?: string;
  joiningDate: string;
  status: number;
  emailId?: string;
  remarks?: string;
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

  getEmployeeDropdown(branchId: number) {
    return this.makeRequest<{ success: boolean; items: EmployeeMaster[] }>(
      `/EmployeeMaster/dropdown/${branchId}`,
      { method: 'GET' }
    );
  }

  createEmployee(data: Partial<EmployeeMaster>) {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/EmployeeMaster`,
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
}

export default new SalaryApiService();
