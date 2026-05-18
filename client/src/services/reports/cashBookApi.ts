import { ApiService, ApiResponse } from '../api';

export interface CashBookEntry {
  voucherNo: number;
  voucherDate: string;
  contraAccountName: string;
  contraAccountIdentifier: string;
  narration?: string;
  amount: number;
}

export interface CashBook {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  sessionFromDate: string;
  sessionToDate: string;
  openingBalance: number;
  receipts: CashBookEntry[];
  payments: CashBookEntry[];
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
}

class CashBookApiService extends ApiService {
  async getCashBook(branchId: number, fromDate: string, toDate: string): Promise<ApiResponse<CashBook>> {
    return this.makeRequest<CashBook>(
      `/CashBook?branchId=${branchId}&fromDate=${fromDate}&toDate=${toDate}`
    );
  }
}

export default new CashBookApiService();
