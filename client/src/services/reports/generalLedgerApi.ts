import { ApiService, ApiResponse } from '../api';

export interface GeneralLedgerAccountItem {
  accountId: number;
  accountName: string;
  accountNo: string;
}

export interface GeneralLedgerRow {
  valueDate: string;
  voucherNo: number;
  narration?: string;
  dr?: number;
  cr?: number;
  runningBalance: number;
}

export interface GeneralLedger {
  branchName: string;
  branchAddress: string;
  accountName: string;
  accountNo: string;
  headName: string;
  accountId: number;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  rows: GeneralLedgerRow[];
  totalDr: number;
  totalCr: number;
  closingBalance: number;
}

class GeneralLedgerApiService extends ApiService {
  async getAccountsForHead(branchId: number, headCode: number): Promise<ApiResponse<GeneralLedgerAccountItem[]>> {
    return this.makeRequest(`/GeneralLedger/accounts?branchId=${branchId}&headCode=${headCode}`);
  }

  async getGeneralLedger(
    branchId: number,
    accountId: number,
    fromDate: string,
    toDate: string
  ): Promise<ApiResponse<GeneralLedger>> {
    return this.makeRequest(
      `/GeneralLedger?branchId=${branchId}&accountId=${accountId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
    );
  }
}

export default new GeneralLedgerApiService();
