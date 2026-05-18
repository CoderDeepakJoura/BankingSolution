import { ApiService, ApiResponse } from '../api';

export interface LoanNPAProductItem {
  id: number;
  productName: string;
}

export interface LoanNPARow {
  accountId: number;
  accountNumber: string;
  accountName: string;
  memberName: string;
  loanDate: string | null;
  loanAmountPassed: number;
  outstandingBalance: number;
  totalRecovered: number;
  lastRecoveryDate: string | null;
  daysOverdue: number;
  overdueInstallments: number;
  overdueAmount: number;
  npaCategory: string;
}

export interface LoanNPASummary {
  npaCategory: string;
  count: number;
  totalOutstanding: number;
  totalOverdue: number;
}

export interface LoanNPA {
  branchName: string;
  branchAddress: string;
  asOfDate: string;
  productName: string;
  rows: LoanNPARow[];
  summary: LoanNPASummary[];
  totalLoanAdvanced: number;
  totalOutstanding: number;
  totalRecovered: number;
  totalOverdue: number;
}

class LoanNPAApiService extends ApiService {
  async getLoanProducts(branchId: number): Promise<ApiResponse<LoanNPAProductItem[]>> {
    return this.makeRequest(`/LoanNPA/products?branchId=${branchId}`);
  }

  async getLoanNPA(
    branchId: number,
    asOfDate: string,
    productId: number,
    npaOnly: boolean
  ): Promise<ApiResponse<LoanNPA>> {
    return this.makeRequest(
      `/LoanNPA?branchId=${branchId}&asOfDate=${encodeURIComponent(asOfDate)}&productId=${productId}&npaOnly=${npaOnly}`
    );
  }
}

export default new LoanNPAApiService();
