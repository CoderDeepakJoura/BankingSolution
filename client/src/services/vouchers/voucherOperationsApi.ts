import { ApiService, ApiResponse } from '../api';

export interface VoucherPreviewEntry {
  entryType: "Dr" | "Cr";
  accountId: number;
  accountName: string;
  accountIdentifier: string;
  amount: number;
  narration?: string;
  isAccClosed: boolean;
  accountType: number;
  generalProductId?: number;
}

export interface VoucherPreview {
  voucherId: number;
  voucherNo: number;
  voucherDate: string;
  voucherType: number;
  voucherSubType: number;
  voucherTypeName: string;
  voucherSubTypeName: string;
  narration?: string;
  status: string;
  deleteOnly: boolean;
  hasClosedAccounts: boolean;
  penaltyAmount?: number;
  entries: VoucherPreviewEntry[];
}

// Maps {voucherType}-{voucherSubType} to the edit route
export const EDIT_ROUTE_MAP: Record<string, string> = {
  "2-2": "/saving-deposit-voucher",
  "2-3": "/saving-withdrawal-voucher",
  "4-8": "/rd-kist-voucher",
  "5-9": "/loan-advancement",
  "6-11": "/cash-payment-receipt-voucher",
  "7-12": "/journal-transfer-voucher",
};

class VoucherOperationsApiService extends ApiService {
  async getPreview(branchId: number, voucherDate: string, voucherNo: number): Promise<ApiResponse<VoucherPreview>> {
    return this.makeRequest(`/VoucherOperations/preview/${branchId}/${voucherDate}/${voucherNo}`);
  }

  async deleteVoucher(branchId: number, voucherDate: string, voucherNo: number): Promise<ApiResponse> {
    return this.makeRequest(`/VoucherOperations/${branchId}/${voucherDate}/${voucherNo}`, {
      method: 'DELETE',
    });
  }
}

export default new VoucherOperationsApiService();
