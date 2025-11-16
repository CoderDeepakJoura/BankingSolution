// services/voucher/savingVoucherApi.ts
import { AuthResponse, ApiService, ApiResponse } from '../../api';

export interface VoucherDTO {
  id?: number;
  brID: number;
  voucherDate: string; 
  voucherNarration: string;
  voucherStatus?: string;
  totalDebit: number;
  debitAccountId: number;
  creditAccountId: number;
}

export interface SavingVoucherDTO {
  voucher: VoucherDTO;
  voucherSubType: "D" | "W"; // D = Deposit, W = Withdrawal
}

export interface SavingVoucherResponse {
  success: boolean;
  message: string;
}

class SavingVoucherApiService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Add new saving deposit/withdrawal voucher
   */
  async addSavingVoucher(
    voucherData: SavingVoucherDTO
  ): Promise<ApiResponse<SavingVoucherResponse>> {
    return this.makeRequest<SavingVoucherResponse>('/SavingDW', {
      method: 'POST',
      body: JSON.stringify(voucherData),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Update existing saving voucher
   */
  async updateSavingVoucher(
    voucherData: SavingVoucherDTO
  ): Promise<ApiResponse<SavingVoucherResponse>> {
    return this.makeRequest<SavingVoucherResponse>('/voucher/saving', {
      method: 'PUT',
      body: JSON.stringify(voucherData),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Delete saving voucher
   */
  async deleteSavingVoucher(
    voucherId: number,
    branchId: number
  ): Promise<ApiResponse<SavingVoucherResponse>> {
    return this.makeRequest<SavingVoucherResponse>(
      `/voucher/saving/${voucherId}/${branchId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export default new SavingVoucherApiService();
