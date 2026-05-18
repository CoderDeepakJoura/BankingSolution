import { ApiService, ApiResponse } from '../api';

export interface LoanProductItem { id: number; productName: string; }

export interface LoanAdvancementRow {
  voucherDate: string;
  voucherNo: number;
  accountNumber: string;
  accountName: string;
  relativeName: string;
  relationName: string;
  particulars: string;
  productName: string;
  amount: number;
  loanAmountPassed: number | null;
}

export interface LoanAdvancement {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  rows: LoanAdvancementRow[];
  totalAmount: number;
}

class LoanAdvancementApiService extends ApiService {
  async getLoanProducts(branchId: number): Promise<ApiResponse<LoanProductItem[]>> {
    return this.makeRequest(`/LoanAdvancement/products?branchId=${branchId}`);
  }
  async getLoanAdvancement(branchId: number, fromDate: string, toDate: string, productId: number): Promise<ApiResponse<LoanAdvancement>> {
    return this.makeRequest(`/LoanAdvancement?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}`);
  }
}

export default new LoanAdvancementApiService();
