import { ApiService, ApiResponse } from '../api';

export interface DayBookEntry {
  voucherNo: number;
  voucherDate: string;
  accHeadCode: number;
  accHeadName: string;
  accountName: string;
  accountIdentifier: string;
  narration?: string;
  amount: number;
}

export interface DayBookGroup {
  groupName: string;
  groupTotal: number;
  entries: DayBookEntry[];
}

export interface DayBook {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  sessionFromDate: string;
  sessionToDate: string;
  openingBalance: number;
  receiptGroups: DayBookGroup[];
  paymentGroups: DayBookGroup[];
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
}

export interface SessionDates {
  fromDate: string;
  toDate: string;
  isFirst: boolean;
}

class DayBookApiService extends ApiService {
  async getSessionDates(branchId: number): Promise<ApiResponse<SessionDates>> {
    return this.makeRequest<SessionDates>(`/DayBook/session?branchId=${branchId}`);
  }

  async getDayBook(branchId: number, fromDate: string, toDate: string): Promise<ApiResponse<DayBook>> {
    return this.makeRequest<DayBook>(
      `/DayBook?branchId=${branchId}&fromDate=${fromDate}&toDate=${toDate}`
    );
  }
}

export default new DayBookApiService();
