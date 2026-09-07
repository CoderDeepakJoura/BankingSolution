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

export interface InterestCalcSegmentDTO {
  fromDate: string;
  toDate: string;
  balance: number;
  days: number;
  rate: number;
  interest: number;
}

export interface PenalBreakdownItemDTO {
  kistNumber: number;
  dueDate: string;
  principalAmount: number;
  daysOverdue: number;
  overdueRate: number;
  penalInterest: number;
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
  actOnIntPosting?: number;
  noInterestReason?: string;
  calcBreakdown?: InterestCalcSegmentDTO[];
  overdueInstallments?: number;
  overduePrincipal?: number;
  penalBreakdown?: PenalBreakdownItemDTO[];
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

export interface LoanInterestPeriodDetailRowDTO {
  date: string;
  particulars: string;
  days: number;
  dr: number;
  cr: number;
  stdBal: number;
  roi: number;
  stdInt: number;
  odd: number;
  odc: number;
  odb: number;
  balance: number;
  oroi: number;
  ovrInt: number;
  tInt: number;
  intBal: number;
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

  async getInterestPeriodDetail(loanAccId: number, branchId: number, asOfDate?: string): Promise<ApiResponse<LoanInterestPeriodDetailRowDTO[]>> {
    let url = `/LoanInterestPosting/period-detail/${loanAccId}?branchId=${branchId}`;
    if (asOfDate) url += `&asOfDate=${asOfDate}`;
    return this.makeRequest(url);
  }
}

export default new LoanInterestPostingApiService();
