import { ApiService, ApiResponse } from '../api';

export interface RDKistProductItem { id: number; productName: string; }

// Non-datewise
export interface RDKistSummaryRow {
  sNo: number;
  accountName: string;
  accountNumber: string;
  creditAmount: number;
  noOfKist: number;
}

// Datewise
export interface RDKistDatewiseRow {
  sNo: number;
  accountName: string;
  accountNumber: string;
  creditAmount: number;
  voucherNo: number;
  noOfKist: number;
}

export interface RDKistDateGroup {
  date: string;
  rows: RDKistDatewiseRow[];
  dateTotal: number;
}

export interface RDKistReceive {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  productName: string;
  showDatewise: boolean;
  summaryRows: RDKistSummaryRow[];
  dateGroups: RDKistDateGroup[];
  grandTotal: number;
  totalCount: number;
}

class RDKistReceiveApiService extends ApiService {
  async getRDProducts(branchId: number): Promise<ApiResponse<RDKistProductItem[]>> {
    return this.makeRequest(`/RDKistReceive/products?branchId=${branchId}`);
  }

  async getRDKistReceive(
    branchId: number,
    fromDate: string,
    toDate: string,
    productId: number,
    showDatewise: boolean
  ): Promise<ApiResponse<RDKistReceive>> {
    return this.makeRequest(
      `/RDKistReceive?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&productId=${productId}&showDatewise=${showDatewise}`
    );
  }
}

export default new RDKistReceiveApiService();
