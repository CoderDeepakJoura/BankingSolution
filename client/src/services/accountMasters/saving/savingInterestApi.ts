import { ApiService, ApiResponse } from '../../api';

export interface MonthlyInterestBreakdownDTO {
  month: string;
  effectiveBalance: number;
  days: number;
  rate: number;
  interest: number;
}

export interface SavingInterestAccountDTO {
  accountId: number;
  accountNumber: string;
  accountName: string;
  currentBalance: number;
  calculatedInterest: number;
  monthlyBreakdown: MonthlyInterestBreakdownDTO[];
}

export interface PostSavingInterestDTO {
  branchId: number;
  productId: number;
  postingDate: string;
  accountIds: number[];
  interestOverrides?: Record<number, number>;
}

class SavingInterestApiService extends ApiService {
  async getEligibleAccounts(
    branchId: number,
    productId: number,
    postingDate: string,
    accountId?: number
  ): Promise<ApiResponse<SavingInterestAccountDTO[]>> {
    let url = `/SavingInterestPosting/eligible-accounts?branchId=${branchId}&productId=${productId}&postingDate=${postingDate}`;
    if (accountId && accountId > 0) url += `&accountId=${accountId}`;
    return this.makeRequest<SavingInterestAccountDTO[]>(url);
  }

  async getClosingPreview(
    branchId: number,
    accountId: number,
    productId: number,
    asOfDate: string
  ): Promise<ApiResponse<{ balance: number; calculatedInterest: number }>> {
    return this.makeRequest<{ balance: number; calculatedInterest: number }>(
      `/SavingInterestPosting/closing-preview?branchId=${branchId}&accountId=${accountId}&productId=${productId}&asOfDate=${asOfDate}`
    );
  }

  async postInterest(dto: PostSavingInterestDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/SavingInterestPosting/post', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new SavingInterestApiService();
