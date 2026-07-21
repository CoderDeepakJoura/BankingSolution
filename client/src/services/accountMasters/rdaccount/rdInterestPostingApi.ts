import { ApiService, ApiResponse } from '../../api';

export interface RDInterestKistBreakdownDTO {
  kistNo: number;
  kistAmount: number;
  kistDate: string;
  earnFrom: string;
  earnTo: string;
  days: number;
  rate: number;
  interest: number;
}

export interface RDInterestAccountDTO {
  accountId: number;
  accountNumber: string;
  accountName: string;
  rdNumber: number;
  interest: number;
  details: RDInterestKistBreakdownDTO[];
}

export interface RDInterestPostingInfoDTO {
  debitAccountName: string;
  debitAccountId: number;
  accounts: RDInterestAccountDTO[];
}

export interface PostRDInterestDTO {
  branchId: number;
  productId: number;
  postingDate: string;
  fromDate: string;
  toDate: string;
  accountIds: number[];
}

class RDInterestPostingApiService extends ApiService {
  async getEligibleAccounts(
    branchId: number,
    productId: number,
    fromDate: string,
    toDate: string,
    accountId?: number
  ): Promise<ApiResponse<RDInterestPostingInfoDTO>> {
    let url = `/RDInterestPosting/eligible-accounts?branchId=${branchId}&productId=${productId}&fromDate=${fromDate}&toDate=${toDate}`;
    if (accountId && accountId > 0) url += `&accountId=${accountId}`;
    return this.makeRequest<RDInterestPostingInfoDTO>(url);
  }

  async postInterest(dto: PostRDInterestDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/RDInterestPosting/post', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new RDInterestPostingApiService();
