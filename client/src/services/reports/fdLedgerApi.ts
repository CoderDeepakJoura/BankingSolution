import { ApiService, ApiResponse } from '../api';

export interface FDProductItem {
  id: number;
  productName: string;
  productCode: string;
}

export interface FDAccountItem {
  id: number;
  accountIdentifier: string;
  accountName: string;
}

export interface FDDetailItem {
  id: number;
  detailLabel: string;
  fdDate: string;
  fdMaturityDate: string;
  fdAmount: number;
  fdStatus: number;
}

export interface FDLedgerEntry {
  voucherNo: number;
  voucherDate: string;
  particulars: string;
  dr: number | null;
  cr: number | null;
  balance: number;
  narration?: string;
}

export interface FDLedger {
  branchName: string;
  branchAddress: string;
  accountName: string;
  accountIdentifier: string;
  productName: string;
  selectedDetailId: number | null;
  selectedDetailLabel: string | null;
  detailFDDate: string | null;
  detailMaturityDate: string | null;
  detailFDAmount: number | null;
  fromDate: string;
  toDate: string;
  sessionFromDate: string;
  sessionToDate: string;
  openingBalance: number;
  entries: FDLedgerEntry[];
  totalDr: number;
  totalCr: number;
  closingBalance: number;
}

export const FD_STATUS_LABELS: Record<number, string> = {
  1: "Open",
  2: "Matured",
  3: "Pre-Matured",
  4: "Renewed",
};

class FDLedgerApiService extends ApiService {
  async getFDProducts(branchId: number): Promise<ApiResponse<FDProductItem[]>> {
    return this.makeRequest<FDProductItem[]>(`/FDLedger/products?branchId=${branchId}`);
  }

  async getFDAccounts(branchId: number, productId: number): Promise<ApiResponse<FDAccountItem[]>> {
    return this.makeRequest<FDAccountItem[]>(`/FDLedger/accounts?branchId=${branchId}&productId=${productId}`);
  }

  async getFDDetails(branchId: number, accountId: number): Promise<ApiResponse<FDDetailItem[]>> {
    return this.makeRequest<FDDetailItem[]>(`/FDLedger/details?branchId=${branchId}&accountId=${accountId}`);
  }

  async getFDLedger(
    branchId: number,
    accountId: number,
    fromDate: string,
    toDate: string,
    detailId?: number
  ): Promise<ApiResponse<FDLedger>> {
    let url = `/FDLedger?branchId=${branchId}&accountId=${accountId}&fromDate=${fromDate}&toDate=${toDate}`;
    if (detailId != null) url += `&detailId=${detailId}`;
    return this.makeRequest<FDLedger>(url);
  }
}

export default new FDLedgerApiService();
