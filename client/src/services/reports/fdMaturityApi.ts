import { ApiService, ApiResponse } from '../api';

export interface FDProductItem { id: number; productName: string; }

export interface FDMaturityRow {
  accountId: number;
  accountNumber: string;
  accountName: string;
  productName: string;
  fdDate: string;
  maturityDate: string;
  fdAmount: number;
  maturityAmount: number;
  periodMonths: number;
  periodDays: number;
  intRate: number;
  status: string;
}

export interface FDMaturity {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  rows: FDMaturityRow[];
  totalFDAmount: number;
  totalMaturityAmount: number;
  totalInterestAmount: number;
}

class FDMaturityApiService extends ApiService {
  async getFDProducts(branchId: number): Promise<ApiResponse<FDProductItem[]>> {
    return this.makeRequest(`/FDMaturity/products?branchId=${branchId}`);
  }
  async getFDMaturity(branchId: number, fromDate: string, toDate: string, productId: number): Promise<ApiResponse<FDMaturity>> {
    return this.makeRequest(`/FDMaturity?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}`);
  }
}

export default new FDMaturityApiService();
