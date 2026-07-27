import { ApiService, ApiResponse } from '../../api';
import { LoanAccountSearchDTO } from './loanRecoveryApi';

export interface LoanInterestPostingInfoDTO {
  loanAccId: number;
  accountNumber: string;
  memberName: string;
  memberRelativeName?: string;
  phoneNo?: string;
  loanNo?: string;
  loanDate?: string;
  standardInterestRate?: number;
  overdueInterestRate?: number;
  principalBalance: number;
  unpostedStdInterest: number;
  unpostedPenalInterest: number;
  totalPostable: number;
  interestCalcFromDate?: string;
  interestCalcToDate?: string;
  intCalcMethod: string;
}

export interface LoanInterestPostingVoucherDTO {
  brId: number;
  loanAccountId: number;
  voucherDate: string;
  stdInterestAmount: number;
  penalInterestAmount: number;
  narration?: string;
}

export interface LoanInterestBatchItemDTO {
  loanAccId: number;
  accountNumber: string;
  memberName: string;
  memberRelativeName?: string;
  principalBalance: number;
  stdInterest: number;
  penalInterest: number;
  stdRecoverable: number;
  totalPostable: number;
  calcFromDate?: string;
  calcToDate?: string;
  stdInterestRate?: number;
  overdueInterestRate?: number;
  intCalcMethod: string;
}

export interface LoanInterestBatchPostItemDTO {
  loanAccountId: number;
  stdInterestAmount: number;
  penalInterestAmount: number;
}

export interface LoanInterestBatchPostRequestDTO {
  brId: number;
  voucherDate: string;
  narration?: string;
  items: LoanInterestBatchPostItemDTO[];
}

export interface LoanInterestBatchPostResultDTO {
  successCount: number;
  failCount: number;
  errors: string[];
}

class LoanInterestPostingApiService extends ApiService {
  async searchAccounts(branchId: number, query: string, productId?: number): Promise<ApiResponse<LoanAccountSearchDTO[]>> {
    const base = `/LoanInterestPosting/search?branchId=${branchId}&query=${encodeURIComponent(query)}`;
    const url = productId ? `${base}&productId=${productId}` : base;
    return this.makeRequest(url);
  }

  async getPostableInterest(loanAccId: number, branchId: number, asOfDate?: string): Promise<ApiResponse<LoanInterestPostingInfoDTO>> {
    const url = asOfDate
      ? `/LoanInterestPosting/postable/${loanAccId}/${branchId}?asOfDate=${asOfDate}`
      : `/LoanInterestPosting/postable/${loanAccId}/${branchId}`;
    return this.makeRequest(url);
  }

  async postInterest(dto: LoanInterestPostingVoucherDTO): Promise<ApiResponse<any>> {
    return this.makeRequest('/LoanInterestPosting', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async batchCalculate(brId: number, productId: number, accountId?: number, asOfDate?: string): Promise<ApiResponse<LoanInterestBatchItemDTO[]>> {
    let url = `/LoanInterestPosting/batch-calculate?brId=${brId}&productId=${productId}`;
    if (accountId) url += `&accountId=${accountId}`;
    if (asOfDate) url += `&asOfDate=${asOfDate}`;
    return this.makeRequest(url);
  }

  async batchPost(dto: LoanInterestBatchPostRequestDTO): Promise<ApiResponse<LoanInterestBatchPostResultDTO>> {
    return this.makeRequest('/LoanInterestPosting/batch-post', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new LoanInterestPostingApiService();
