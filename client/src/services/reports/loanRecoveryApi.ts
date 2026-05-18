import { ApiService, ApiResponse } from '../api';
import type { LoanProductItem } from './loanAdvancementApi';

export interface LoanRecoveryRow {
  voucherDate: string;
  voucherNo: number;
  accountNumber: string;
  accountName: string;
  productName: string;
  recoveryAmount: number;
  loanDate: string | null;
  loanAmountPassed: number | null;
}

export interface LoanRecovery {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  rows: LoanRecoveryRow[];
  totalRecovery: number;
}

class LoanRecoveryApiService extends ApiService {
  async getLoanProducts(branchId: number): Promise<ApiResponse<LoanProductItem[]>> {
    return this.makeRequest(`/LoanRecovery/products?branchId=${branchId}`);
  }
  async getLoanRecovery(branchId: number, fromDate: string, toDate: string, productId: number): Promise<ApiResponse<LoanRecovery>> {
    return this.makeRequest(`/LoanRecovery?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}`);
  }
}

export default new LoanRecoveryApiService();
