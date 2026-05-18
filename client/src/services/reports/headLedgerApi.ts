import { ApiService, ApiResponse } from '../api';

export interface AccountHeadItem {
  headCode: number;
  name: string;
  categoryId: number;
  typeName: string;
}

export interface HeadLedgerAccount {
  accountId: number;
  accountName: string;
  accountNo: string;
  openingBalance: number;
  periodDr: number;
  periodCr: number;
  closingBalance: number;
}

export interface HeadLedger {
  branchName: string;
  branchAddress: string;
  headName: string;
  headCode: number;
  typeName: string;
  fromDate: string;
  toDate: string;
  accounts: HeadLedgerAccount[];
  totalOpeningBalance: number;
  totalPeriodDr: number;
  totalPeriodCr: number;
  totalClosingBalance: number;
}

class HeadLedgerApiService extends ApiService {
  async getAccountHeads(branchId: number): Promise<ApiResponse<AccountHeadItem[]>> {
    return this.makeRequest(`/HeadLedger/heads?branchId=${branchId}`);
  }

  async getHeadLedger(
    branchId: number,
    headCode: number,
    fromDate: string,
    toDate: string
  ): Promise<ApiResponse<HeadLedger>> {
    return this.makeRequest(
      `/HeadLedger?branchId=${branchId}&headCode=${headCode}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
    );
  }
}

export default new HeadLedgerApiService();
