import { ApiService, ApiResponse } from '../api';
import type { LoanProductItem } from './loanAdvancementApi';

export interface LoanDemandRow {
  accountNumber: string;
  accountName: string;
  productName: string;
  loanDate: string | null;
  loanAmount: number | null;
  kistNumber: number;
  kistDate: string | null;
  kistAmount: number;
  principalAmt: number;
  interestAmt: number;
  status: string;
}

export interface LoanDemand {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  rows: LoanDemandRow[];
  totalKistAmount: number;
  totalPrincipal: number;
  totalInterest: number;
  paidCount: number;
  pendingCount: number;
}

class LoanDemandApiService extends ApiService {
  async getLoanProducts(branchId: number): Promise<ApiResponse<LoanProductItem[]>> {
    return this.makeRequest(`/LoanDemand/products?branchId=${branchId}`);
  }
  async getLoanDemand(branchId: number, fromDate: string, toDate: string, productId: number, showPendingOnly: boolean): Promise<ApiResponse<LoanDemand>> {
    return this.makeRequest(`/LoanDemand?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}&showPendingOnly=${showPendingOnly}`);
  }
}

export default new LoanDemandApiService();
