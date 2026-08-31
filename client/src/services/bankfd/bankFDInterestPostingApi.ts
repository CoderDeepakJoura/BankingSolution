import { ApiService, ApiResponse } from '../api';

export interface BFDIPPreviewRow {
  accId: number;
  detailId: number;
  accNo: string;
  accName: string;
  ltdNo: string;
  fdBalance: number;
  intAmount: number;
  tdsAmount: number;
  tdsRate: number;
  lastPostingDate: string;
  intRate: number;
  intCompInterval: number;
}

export interface BFDIPRowDTO {
  accId: number;
  detailId: number;
  intAmount: number;
  tdsAmount: number;
  lastPostingDate: string;
}

export interface BFDIPPostRequest {
  branchId: number;
  voucherDate: string;
  creditAccId: number;
  narration: string;
  rows: BFDIPRowDTO[];
}

class BankFDInterestPostingApiService extends ApiService {
  getAccounts(branchId: number, headId: number): Promise<ApiResponse<{ accId: number; accNo: string; accountName: string }[]>> {
    return this.makeRequest(`/BankFDInterestPosting/${branchId}/accounts?headId=${headId}`);
  }

  getPreview(branchId: number, headId: number, accId: number, currDate: string, fromDate?: string): Promise<ApiResponse<BFDIPPreviewRow[]>> {
    let url = `/BankFDInterestPosting/${branchId}/preview?headId=${headId}&accId=${accId}&currDate=${currDate}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    return this.makeRequest(url);
  }

  post(req: BFDIPPostRequest): Promise<ApiResponse<null>> {
    return this.makeRequest(`/BankFDInterestPosting/${req.branchId}/post`, {
      method: 'POST',
      body: JSON.stringify(req),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const bankFDInterestPostingApi = new BankFDInterestPostingApiService();
