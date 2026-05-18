import { ApiService, ApiResponse } from '../api';

export interface JournalEntry {
  voucherDate: string;
  voucherNo: number;
  accountNumber: string;
  accountName: string;
  narration: string | null;
  dr: number;
  cr: number;
}

export interface JournalBook {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  entries: JournalEntry[];
  totalDr: number;
  totalCr: number;
}

class JournalBookApiService extends ApiService {
  async getSessionDates(branchId: number): Promise<ApiResponse<{ fromDate: string; toDate: string }>> {
    return this.makeRequest(`/JournalBook/session?branchId=${branchId}`);
  }
  async getJournalBook(branchId: number, fromDate: string, toDate: string): Promise<ApiResponse<JournalBook>> {
    return this.makeRequest(`/JournalBook?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`);
  }
}

export default new JournalBookApiService();
