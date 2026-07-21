import { ApiService, ApiResponse } from '../../api';

export interface FDInterestDetailDTO {
  fdDetailId: number;
  serialNo: number;
  fdAmount: number;
  fdDate: string;
  fdMaturityDate: string;
  intRate: number;
  compInterval: number;
  periodFrom: string;
  periodTo: string;
  days: number;
  interest: number;
}

export interface FDInterestAccountDTO {
  accountId: number;
  accountNumber: string;
  accountName: string;
  totalInterest: number;
  details: FDInterestDetailDTO[];
}

export interface PostFDInterestDTO {
  branchId: number;
  productId: number;
  postingDate: string;
  accountIds: number[];
  isMIS: boolean;
}

export interface FDProductOption {
  id: number;
  productName: string;
}

class FDInterestPostingApiService extends ApiService {
  // intAccountType: 1 = SameAccount (FD), 2 = OtherAccount (MIS)
  async getProductsByType(branchId: number, intAccountType: number): Promise<ApiResponse<FDProductOption[]>> {
    return this.makeRequest<FDProductOption[]>(`/fetchdata/fd-products-by-type/${branchId}/${intAccountType}`);
  }

  async getEligibleAccounts(
    branchId: number,
    productId: number,
    postingDate: string,
    isMIS: boolean,
    accountId?: number
  ): Promise<ApiResponse<FDInterestAccountDTO[]>> {
    let url = `/FDInterestPosting/eligible-accounts?branchId=${branchId}&productId=${productId}&postingDate=${postingDate}&isMIS=${isMIS}`;
    if (accountId && accountId > 0) url += `&accountId=${accountId}`;
    return this.makeRequest<FDInterestAccountDTO[]>(url);
  }

  async postInterest(dto: PostFDInterestDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/FDInterestPosting/post', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new FDInterestPostingApiService();
