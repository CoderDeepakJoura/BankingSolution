import { ApiService, ApiResponse } from '../api';

export interface LoanProductItem {
  id: number;
  productName: string;
  productCode: string;
}

export interface LoanAccountItem {
  id: number;
  accountNumber: string;
  accountName: string;
}

export interface LoanLedgerEntry {
  voucherNo: number;
  voucherDate: string;
  particulars: string;
  dr: number | null;
  cr: number | null;
  balance: number;
  narration?: string;
}

export interface LoanLedger {
  branchName: string;
  branchAddress: string;
  accountName: string;
  accountNumber: string;
  productName: string;
  fromDate: string;
  toDate: string;
  sessionFromDate: string;
  sessionToDate: string;
  openingBalance: number;
  entries: LoanLedgerEntry[];
  totalDr: number;
  totalCr: number;
  closingBalance: number;
}

class LoanLedgerApiService extends ApiService {
  async getLoanProducts(branchId: number): Promise<ApiResponse<LoanProductItem[]>> {
    return this.makeRequest<LoanProductItem[]>(`/LoanLedger/products?branchId=${branchId}`);
  }

  async getLoanAccounts(branchId: number, productId: number): Promise<ApiResponse<LoanAccountItem[]>> {
    return this.makeRequest<LoanAccountItem[]>(`/LoanLedger/accounts?branchId=${branchId}&productId=${productId}`);
  }

  async getLoanLedger(branchId: number, accountId: number, fromDate: string, toDate: string): Promise<ApiResponse<LoanLedger>> {
    return this.makeRequest<LoanLedger>(
      `/LoanLedger?branchId=${branchId}&accountId=${accountId}&fromDate=${fromDate}&toDate=${toDate}`
    );
  }
}

export default new LoanLedgerApiService();
