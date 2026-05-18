import { ApiService, ApiResponse } from '../../api';

export interface RDKistVoucherDTO {
  brID: number;
  voucherDate: string;
  voucherNarration: string;
  rdAccountId: number;
  kistAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  savingProductId: number | null;
  savingAccountId: number | null;
  fromSavingAmount: number;
  debitAccountId: number | null;
  agent: string;
}

export interface RDKistVoucherResponse {
  success: boolean;
  message: string;
}

class RDKistVoucherApiService extends ApiService {
  constructor() {
    super();
  }

  async addRDKistVoucher(
    voucherData: RDKistVoucherDTO
  ): Promise<ApiResponse<RDKistVoucherResponse>> {
    return this.makeRequest<RDKistVoucherResponse>('/RDKist', {
      method: 'POST',
      body: JSON.stringify(voucherData),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateRDKistVoucher(voucherId: number, voucherData: RDKistVoucherDTO): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/RDKist/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(voucherData),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new RDKistVoucherApiService();
