import { ApiService, ApiResponse } from '../api';

export interface SavingProductItem {
  id: number;
  productName: string;
  productCode: string;
}

export interface SavingAccountItem {
  id: number;
  accountIdentifier: string;
  accountName: string;
}

export interface SavingLedgerEntry {
  voucherNo: number;
  voucherDate: string;
  particulars: string;
  dr?: number;
  cr?: number;
  balance: number;
  narration?: string;
}

export interface SavingLedger {
  branchName: string;
  branchAddress: string;
  accountName: string;
  accountIdentifier: string;
  productName: string;
  fromDate: string;
  toDate: string;
  sessionFromDate: string;
  sessionToDate: string;
  openingBalance: number;
  entries: SavingLedgerEntry[];
  totalDr: number;
  totalCr: number;
  closingBalance: number;
}

class SavingLedgerApiService extends ApiService {
  async getSavingProducts(branchId: number): Promise<ApiResponse<SavingProductItem[]>> {
    return this.makeRequest<SavingProductItem[]>(`/SavingLedger/products?branchId=${branchId}`);
  }

  async getSavingAccounts(branchId: number, productId: number): Promise<ApiResponse<SavingAccountItem[]>> {
    return this.makeRequest<SavingAccountItem[]>(`/SavingLedger/accounts?branchId=${branchId}&productId=${productId}`);
  }

  async getSavingLedger(branchId: number, accountId: number, fromDate: string, toDate: string): Promise<ApiResponse<SavingLedger>> {
    return this.makeRequest<SavingLedger>(
      `/SavingLedger?branchId=${branchId}&accountId=${accountId}&fromDate=${fromDate}&toDate=${toDate}`
    );
  }
}

export default new SavingLedgerApiService();
