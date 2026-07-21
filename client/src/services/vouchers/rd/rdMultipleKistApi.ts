import { ApiService, ApiResponse } from '../../api';

export interface RDAccountForKist {
  accId: number;
  accNo: string;
  accountName: string;
  kistAmt: number;
  rdNumber?: number;
  interestRate?: number;
  maturityDate?: string;
  rdAmount?: number;
  firstKistDate?: string;
}

export interface RDMultipleKistItemDTO {
  rdAccountId: number;
  kistAmount: number;
}

export interface RDMultipleKistVoucherDTO {
  brID: number;
  voucherDate: string;
  voucherNarration?: string;
  debitAccountId: number;
  items: RDMultipleKistItemDTO[];
}

class RDMultipleKistApiService extends ApiService {
  async getAccountsForKist(branchId: number, productId: number): Promise<ApiResponse<RDAccountForKist[]>> {
    return this.makeRequest<RDAccountForKist[]>(
      `/fetchdata/rd-accounts-for-kist/${branchId}/${productId}`
    );
  }

  async save(dto: RDMultipleKistVoucherDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/RDMultipleKist', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async update(voucherId: number, dto: RDMultipleKistVoucherDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>(`/RDMultipleKist/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new RDMultipleKistApiService();
