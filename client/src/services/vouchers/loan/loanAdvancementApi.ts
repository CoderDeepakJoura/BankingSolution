import { ApiService, ApiResponse } from '../../api';

export interface LoanAdvancementCreditItemDTO {
  accountId: number;
  accountType: number;
  amount: number;
  narration?: string;
}

export interface LoanAdvancementVoucherDTO {
  brId: number;
  voucherDate: string;
  loanAccountId: number;
  totalAmount: number;
  narration?: string;
  creditItems: LoanAdvancementCreditItemDTO[];
}

class LoanAdvancementApiService extends ApiService {
  constructor() {
    super();
  }

  async addLoanAdvancement(dto: LoanAdvancementVoucherDTO): Promise<ApiResponse<any>> {
    return this.makeRequest('/LoanAdvancement', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateLoanAdvancement(voucherId: number, dto: LoanAdvancementVoucherDTO): Promise<ApiResponse<any>> {
    return this.makeRequest(`/LoanAdvancement/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new LoanAdvancementApiService();
