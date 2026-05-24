import { ApiService, ApiResponse } from '../api';

export interface NpaLedgerPlanItem {
  id: number;
  name: string;
}

export interface NpaLedgerCategoryItem {
  id: number;
  description: string;
  periodFrom: number | null;
  periodTo: number | null;
  seqNo: number | null;
  isGroup: boolean;
}

export interface NpaLedgerRequest {
  branchId: number;
  fromDate: string;
  toDate: string;
  planId: number;
  categoryIds: number[];
}

export interface NpaLedgerRow {
  accountId: number;
  accountNumber: string;
  accountName: string;
  memberName: string;
  loanProductName: string;
  loanDate: string | null;
  loanAmount: number;
  openingBalance: number;
  loanAdvanced: number;
  repaid: number;
  closingBalance: number;
  npaAmount: number;
  daysOverdue: number;
  overdueInstallments: number;
  categoryId: number;
  categoryName: string;
}

export interface NpaLedgerData {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  planName: string;
  rows: NpaLedgerRow[];
  totalOpeningBalance: number;
  totalLoanAdvanced: number;
  totalRepaid: number;
  totalClosingBalance: number;
  totalNpa: number;
}

class NpaLedgerApiService extends ApiService {
  async getPlans(branchId: number): Promise<ApiResponse<NpaLedgerPlanItem[]>> {
    return this.makeRequest<NpaLedgerPlanItem[]>(`/NpaLedger/plans?branchId=${branchId}`);
  }

  async getCategories(branchId: number, planId: number): Promise<ApiResponse<NpaLedgerCategoryItem[]>> {
    return this.makeRequest<NpaLedgerCategoryItem[]>(`/NpaLedger/categories?branchId=${branchId}&planId=${planId}`);
  }

  async getReport(req: NpaLedgerRequest): Promise<ApiResponse<NpaLedgerData>> {
    return this.makeRequest<NpaLedgerData>('/NpaLedger/report', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }
}

export default new NpaLedgerApiService();
