import { ApiService, ApiResponse } from '../api';

export interface FDOpeningProductItem { id: number; productName: string; }

export interface FDOpeningRow {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accDetail: string;
  productName: string;
  fdDate: string;
  fdAmount: number;
  maturityAmount: number;
  openingAmount: number;
  periodMonths: number;
  remarks: string;
}

export interface FDOpening {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  rows: FDOpeningRow[];
  totalFDAmount: number;
  totalMaturityAmount: number;
  totalOpeningAmount: number;
}

class FDOpeningApiService extends ApiService {
  async getFDProducts(branchId: number): Promise<ApiResponse<FDOpeningProductItem[]>> {
    return this.makeRequest(`/FDOpening/products?branchId=${branchId}`);
  }
  async getFDOpening(branchId: number, fromDate: string, toDate: string, productId: number): Promise<ApiResponse<FDOpening>> {
    return this.makeRequest(`/FDOpening?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}`);
  }
}

export default new FDOpeningApiService();
