import { ApiService, ApiResponse } from '../../api';

export interface TaxLineDTO {
  taxTypeId: number;
  taxTypeName?: string;
  perc: number;
  taxAmt: number;
  accId: number;
}

export interface GSTDetailDTO {
  billBookId: number;
  billNo: number;
  stateId: number;
  stateName?: string;
  supplyTypeId: number;
  gstinNo?: string;
  serviceId: number;
  serviceName?: string;
  taxId: number;
  taxName?: string;
  taxLines: TaxLineDTO[];
}

export interface LoanExpenseDTO {
  id?: number;
  branchId: number;
  date: string;
  loanProductId: number;
  drAccountId: number;
  expenseCategoryId: number;
  expenseAmount: number;
  totalTax: number;
  netAmount: number;
  remarks?: string;
  crAccountTypeId: number;
  crAccountId: number;
  gstDetail?: GSTDetailDTO;
}

export interface LoanExpenseListDTO {
  id: number;
  date?: string;
  loanProductName?: string;
  accountName?: string;
  expenseCategoryName?: string;
  expenseAmount: number;
  totalTax: number;
  netAmount: number;
  remarks?: string;
  voucherNo: number;
}

export interface ServiceLookupDTO {
  hasService: boolean;
  serviceId: number;
  serviceName?: string;
  taxId: number;
  taxName?: string;
  taxLines: TaxLineDTO[];
}

export interface BillBookForExpenseDTO {
  id: number;
  name?: string;
  billNoGeneration: number;
  nextBillNo: number;
}

class LoanExpenseApiService extends ApiService {
  async getServiceLookup(
    accId: number, branchId: number, date: string, supplyTypeId: number
  ): Promise<ApiResponse<ServiceLookupDTO>> {
    return this.makeRequest(
      `/LoanExpense/service-lookup/${accId}?branchId=${branchId}&date=${encodeURIComponent(date)}&supplyTypeId=${supplyTypeId}`
    );
  }

  async getBillBooks(branchId: number): Promise<ApiResponse<BillBookForExpenseDTO[]>> {
    return this.makeRequest(`/LoanExpense/bill-books?branchId=${branchId}`);
  }

  async getBranchGstInfo(branchId: number): Promise<ApiResponse<{ gstNo: string; stateId: number }>> {
    return this.makeRequest(`/LoanExpense/branch-gst-info?branchId=${branchId}`);
  }

  async create(dto: LoanExpenseDTO): Promise<ApiResponse<any>> {
    return this.makeRequest('/LoanExpense', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse<LoanExpenseDTO>> {
    return this.makeRequest(`/LoanExpense/${id}?branchId=${branchId}`);
  }

  async update(id: number, dto: LoanExpenseDTO): Promise<ApiResponse<any>> {
    return this.makeRequest(`/LoanExpense/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getAll(branchId: number, pageNumber = 1, pageSize = 20, searchTerm = '', date = ''): Promise<ApiResponse<any>> {
    const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
    return this.makeRequest(
      `/LoanExpense?branchId=${branchId}&pageNumber=${pageNumber}&pageSize=${pageSize}&searchTerm=${encodeURIComponent(searchTerm)}${dateParam}`
    );
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/LoanExpense/${id}?branchId=${branchId}`, { method: 'DELETE' });
  }
}

export default new LoanExpenseApiService();
