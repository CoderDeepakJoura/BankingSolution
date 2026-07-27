import { ApiService, ApiResponse } from '../api';

export interface AccountHeadItem {
  headCode: number;
  name: string;
  categoryId: number;
  typeName: string;
}

// Used by head-consolidate (summary table) and head-accounts (per-account sections)
export interface HeadLedgerRow {
  valueDate: string;
  voucherNo: number;
  narration?: string;
  dr?: number;
  cr?: number;
  runningBalance: number;
}

export interface HeadLedgerAccount {
  accountId: number;
  accountName: string;
  accountNo: string;
  openingBalance: number;
  periodDr: number;
  periodCr: number;
  closingBalance: number;
  rows?: HeadLedgerRow[];
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

// Used by head-detail (flat combined list, single running balance for entire head)
export interface HeadInDetailRow {
  valueDate: string;
  // Populated in individual-row mode: "AccName Tr.No.N Narration"
  // null/absent in consolidate (date-grouped) mode
  particulars?: string;
  dr?: number;
  cr?: number;
  runningBalance: number;
}

export interface HeadInDetail {
  branchName: string;
  branchAddress: string;
  headName: string;
  headCode: number;
  typeName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDr: number;
  totalCr: number;
  closingBalance: number;
  rows: HeadInDetailRow[];
}

class HeadLedgerApiService extends ApiService {
  async getAccountHeads(branchId: number): Promise<ApiResponse<AccountHeadItem[]>> {
    return this.makeRequest(`/HeadLedger/heads?branchId=${branchId}`);
  }

  // format="consolidate" → HeadLedger (summary table)
  // format="accounts"    → HeadLedger (per-account sections, personal accounts)
  async getHeadLedger(
    branchId: number,
    headCode: number,
    fromDate: string,
    toDate: string,
    format: "consolidate" | "accounts",
    nonZero = false
  ): Promise<ApiResponse<HeadLedger>> {
    return this.makeRequest(
      `/HeadLedger?branchId=${branchId}&headCode=${headCode}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&format=${format}&nonZero=${nonZero}`
    );
  }

  // format="detail" → HeadInDetail (flat combined list)
  async getHeadInDetail(
    branchId: number,
    headCode: number,
    fromDate: string,
    toDate: string,
    consolidate = false,
    nonZero = false
  ): Promise<ApiResponse<HeadInDetail>> {
    return this.makeRequest(
      `/HeadLedger?branchId=${branchId}&headCode=${headCode}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&format=detail&consolidate=${consolidate}&nonZero=${nonZero}`
    );
  }
}

export default new HeadLedgerApiService();
