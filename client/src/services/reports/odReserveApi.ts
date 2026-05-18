import { ApiService, ApiResponse } from '../api';

export interface OdReserveProduct { id: number; productName: string; }

export interface GeneralAccount { id: number; accountNumber: string; accountName: string; }

export interface OdReserveRow {
  sNo: number;
  accId: number;
  accountName: string;
  acNo: string;
  productName: string;
  productId: number;
  debit: number;
  credit: number;
  intBal: number;
}

export interface OdReserveReport {
  branchName: string;
  branchAddress: string;
  quarterLabel: string;
  quarterDate: string;
  totalDebit: number;
  totalCredit: number;
  totalOdReserve: number;
  rows: OdReserveRow[];
}

class OdReserveApiService extends ApiService {
  async getProducts(branchId: number): Promise<ApiResponse<OdReserveProduct[]>> {
    return this.makeRequest(`/OdReserve/products?branchId=${branchId}`);
  }
  async getGeneralAccounts(branchId: number): Promise<ApiResponse<GeneralAccount[]>> {
    return this.makeRequest(`/OdReserve/general-accounts?branchId=${branchId}`);
  }
  async getReport(branchId: number, productId: number, quarterDate: string): Promise<ApiResponse<OdReserveReport>> {
    return this.makeRequest(
      `/OdReserve?branchId=${branchId}&productId=${productId}&quarterDate=${encodeURIComponent(quarterDate)}`
    );
  }
  async save(branchId: number, productId: number, quarterDate: string, rows: OdReserveRow[]): Promise<ApiResponse<void>> {
    return this.makeRequest('/OdReserve/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, productId, quarterDate, rows }),
    });
  }
}

export default new OdReserveApiService();
