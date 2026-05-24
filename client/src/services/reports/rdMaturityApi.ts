import { ApiService, ApiResponse } from '../api';

export interface RDMaturityProductItem { id: number; productName: string; }

export interface RDMaturityRow {
  accountId: number;
  accountNumber: string;
  accountName: string;
  productName: string;
  rdNumber: number;
  openingDate: string;
  maturityDate: string;
  paymentDate: string | null;
  rdAmount: number;
  maturityAmount: number;
}

export interface RDMaturity {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  rows: RDMaturityRow[];
  totalRDAmount: number;
  totalMaturityAmount: number;
}

class RDMaturityApiService extends ApiService {
  async getRDProducts(branchId: number): Promise<ApiResponse<RDMaturityProductItem[]>> {
    return this.makeRequest(`/RDMaturity/products?branchId=${branchId}`);
  }
  async getRDMaturity(branchId: number, fromDate: string, toDate: string, productId: number): Promise<ApiResponse<RDMaturity>> {
    return this.makeRequest(`/RDMaturity?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}`);
  }
}

export default new RDMaturityApiService();
