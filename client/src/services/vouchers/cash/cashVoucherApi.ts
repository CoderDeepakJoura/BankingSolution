import { ApiService, ApiResponse } from '../../api';

export interface CashVoucherEntryDTO {
  accountId: number;
  accountType: number;
  entryType: "Cr" | "Dr";
  amount: number;
}

export interface CashPaymentReceiptDTO {
  brID: number;
  voucherDate: string;
  voucherNarration?: string;
  cashAccountId: number;
  entries: CashVoucherEntryDTO[];
}

export interface CashVoucherResponse {
  success: boolean;
  message: string;
}

class CashVoucherApiService extends ApiService {
  constructor() {
    super();
  }

  async addCashVoucher(data: CashPaymentReceiptDTO): Promise<ApiResponse<CashVoucherResponse>> {
    return this.makeRequest<CashVoucherResponse>('/CashPaymentReceipt', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateCashVoucher(voucherId: number, data: CashPaymentReceiptDTO): Promise<ApiResponse<CashVoucherResponse>> {
    return this.makeRequest<CashVoucherResponse>(`/CashPaymentReceipt/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new CashVoucherApiService();
