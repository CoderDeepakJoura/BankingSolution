import { ApiService, ApiResponse } from '../api';

export interface ShareMoneyAccountItem {
  id: number;
  accountIdentifier: string;
  accountName: string;
}

export interface ShareMoneyLedgerEntry {
  voucherNo: number;
  voucherDate: string;
  particulars: string;
  dr?: number;
  cr?: number;
  balance: number;
  narration?: string;
}

export interface ShareMoneyLedger {
  branchName: string;
  branchAddress: string;
  accountName: string;
  accountIdentifier: string;
  fromDate: string;
  toDate: string;
  sessionFromDate: string;
  sessionToDate: string;
  openingBalance: number;
  entries: ShareMoneyLedgerEntry[];
  totalDr: number;
  totalCr: number;
  closingBalance: number;
}

class ShareMoneyLedgerApiService extends ApiService {
  async getShareMoneyAccounts(branchId: number): Promise<ApiResponse<ShareMoneyAccountItem[]>> {
    return this.makeRequest<ShareMoneyAccountItem[]>(`/ShareMoneyLedger/accounts?branchId=${branchId}`);
  }

  async getShareMoneyLedger(branchId: number, accountId: number, fromDate: string, toDate: string): Promise<ApiResponse<ShareMoneyLedger>> {
    return this.makeRequest<ShareMoneyLedger>(
      `/ShareMoneyLedger?branchId=${branchId}&accountId=${accountId}&fromDate=${fromDate}&toDate=${toDate}`
    );
  }
}

export default new ShareMoneyLedgerApiService();
