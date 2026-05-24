import { ApiService, ApiResponse } from '../api';

export interface RDProductItem {
  id: number;
  productName: string;
  productCode: string;
}

export interface RDAccountItem {
  id: number;
  accountIdentifier: string;
  accountName: string;
}

export interface RDLedgerEntry {
  voucherNo: number;
  voucherDate: string;
  particulars: string;
  dr?: number;
  cr?: number;
  balance: number;
  narration?: string;
}

export interface RDLedger {
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
  entries: RDLedgerEntry[];
  totalDr: number;
  totalCr: number;
  closingBalance: number;
  relativeName?: string;
  contactNo?: string;
  address?: string;
  kistAmount?: number;
  rdDate?: string;
  firstKistDate?: string;
  kistInterval?: number;
  periodMonths?: number;
  interestRate?: number;
  maturityDate?: string;
  maturityAmount?: number;
}

class RDLedgerApiService extends ApiService {
  async getRDProducts(branchId: number): Promise<ApiResponse<RDProductItem[]>> {
    return this.makeRequest<RDProductItem[]>(`/RDLedger/products?branchId=${branchId}`);
  }

  async getRDAccounts(branchId: number, productId: number): Promise<ApiResponse<RDAccountItem[]>> {
    return this.makeRequest<RDAccountItem[]>(`/RDLedger/accounts?branchId=${branchId}&productId=${productId}`);
  }

  async getRDLedger(branchId: number, accountId: number, fromDate: string, toDate: string): Promise<ApiResponse<RDLedger>> {
    return this.makeRequest<RDLedger>(
      `/RDLedger?branchId=${branchId}&accountId=${accountId}&fromDate=${fromDate}&toDate=${toDate}`
    );
  }
}

export default new RDLedgerApiService();
