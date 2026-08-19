import { ApiService, ApiResponse } from '../api';

export interface BankFDAccountSearchItem {
  id: number;
  accountIdentifier: string;
  accountName: string;
}

export interface BankFDDetailSearchItem {
  id: number;
  detailLabel: string;
  ltdNo: string;
  serialNo: number | null;
  fdDate: string;
  fdMaturityDate: string;
  fdAmount: number;
  maturityAmount: number;
  intRate: number;
  fdPeriodMonths: number;
  fdPeriodDays: number;
  fdStatus: number;
}

export interface BankFDLedgerEntry {
  voucherNo: number;
  voucherDate: string;
  particulars: string;
  operation: string;
  dr: number | null;
  cr: number | null;
  balance: number;
  narration?: string;
}

export interface BankFDLedger {
  branchName: string;
  accountName: string;
  accountIdentifier: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  entries: BankFDLedgerEntry[];
  totalDr: number;
  totalCr: number;
  closingBalance: number;
  selectedDetailId: number | null;
  ltdNo: string | null;
  serialNo: number | null;
  fdAmount: number | null;
  intRate: number | null;
  fdPeriodMonths: number | null;
  fdPeriodDays: number | null;
  fdDate: string | null;
  fdMaturityDate: string | null;
  maturityAmount: number | null;
  fdStatus: number | null;
  relativeName?: string;
  contactNo?: string;
}

export const BANK_FD_STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Matured",
  3: "Pre-Matured",
  4: "Renewed",
};

export const BANK_FD_OP_LABELS: Record<string, string> = {
  BM: "Matured",
  BP: "Pre-Matured",
  BR: "Renewed (From)",
  RC: "Renewed (To)",
};

class BankFDLedgerApiService extends ApiService {
  async getAccounts(branchId: number, query?: string, fromDate?: string, toDate?: string): Promise<ApiResponse<BankFDAccountSearchItem[]>> {
    let url = `/BankFDLedger/accounts?branchId=${branchId}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return this.makeRequest<BankFDAccountSearchItem[]>(url);
  }

  async getDetails(branchId: number, accountId: number): Promise<ApiResponse<BankFDDetailSearchItem[]>> {
    return this.makeRequest<BankFDDetailSearchItem[]>(
      `/BankFDLedger/details?branchId=${branchId}&accountId=${accountId}`
    );
  }

  async getLedger(
    branchId: number,
    accountId: number,
    fromDate: string,
    toDate: string,
    detailId?: number
  ): Promise<ApiResponse<BankFDLedger>> {
    let url = `/BankFDLedger?branchId=${branchId}&accountId=${accountId}&fromDate=${fromDate}&toDate=${toDate}`;
    if (detailId != null) url += `&detailId=${detailId}`;
    return this.makeRequest<BankFDLedger>(url);
  }
}

export default new BankFDLedgerApiService();
