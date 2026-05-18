import { ApiService, ApiResponse } from '../api';

export interface RDKistProductItem { id: number; productName: string; }

export interface RDKistReceiveRow {
  voucherDate: string;
  voucherNo: number;
  accountNumber: string;
  accountName: string;
  productName: string;
  kistAmount: number;
  penaltyAmount: number;
  totalAmount: number;
}

export interface RDKistReceive {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  rows: RDKistReceiveRow[];
  totalKistAmount: number;
  totalPenaltyAmount: number;
  grandTotal: number;
  totalCount: number;
}

class RDKistReceiveApiService extends ApiService {
  async getRDProducts(branchId: number): Promise<ApiResponse<RDKistProductItem[]>> {
    return this.makeRequest(`/RDKistReceive/products?branchId=${branchId}`);
  }
  async getRDKistReceive(branchId: number, fromDate: string, toDate: string, productId: number): Promise<ApiResponse<RDKistReceive>> {
    return this.makeRequest(`/RDKistReceive?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}`);
  }
}

export default new RDKistReceiveApiService();
