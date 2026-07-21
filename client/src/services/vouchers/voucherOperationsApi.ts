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

// Maps {voucherType}-{voucherSubType} to a human-readable reason when modify is blocked
export const MODIFY_BLOCKED_REASON: Record<string, string> = {
  "2-4":  "Interest posting vouchers are system-generated and cannot be modified.",
  "3-1":  "Share money vouchers cannot be modified directly. Close or re-open the account instead.",
  "4-5":  "RD maturity vouchers are read-only. Delete the maturity voucher to reopen the account.",
  "4-7":  "RD pre-mature vouchers are read-only. Delete the voucher to reopen the account.",
  "5-10": "Loan recovery vouchers cannot be modified here. Use the Loan Recovery screen.",
  "5-13": "Loan interest posting vouchers are system-generated and cannot be modified.",
  "5-15": "Loan interest posting vouchers are system-generated and cannot be modified.",
  "6-2":  "FD deposit vouchers cannot be modified directly. Use the FD Account Master instead.",
  "6-5":  "FD maturity vouchers are read-only. Delete the maturity voucher to reopen the FD.",
  "6-6":  "FD renewal vouchers are read-only. Delete the renewal voucher to reopen the FD.",
  "6-7":  "FD pre-mature vouchers are read-only. Delete the voucher to reopen the FD.",
  "9-19": "IB vouchers cannot be modified. To make changes, delete the later step(s) first, then delete this voucher and re-enter it.",
  "9-20": "IB HO credit vouchers are auto-generated. Delete this step to revert the IB record, then re-approve.",
  "9-21": "IB vouchers cannot be modified. To make changes, delete the later step(s) first, then delete this voucher and re-enter it.",
  "9-22": "IB HO settlement vouchers cannot be modified. Delete this step to revert the IB record, then re-approve.",
  "9-23": "IB destination branch credit vouchers are auto-generated. Delete this step to revert the IB record, then re-approve.",
};

// Maps {voucherType}-{voucherSubType} to the edit route
export const EDIT_ROUTE_MAP: Record<string, string> = {
  "2-2": "/saving-deposit-voucher",
  "2-3": "/saving-withdrawal-voucher",
  "4-8": "/rd-kist-voucher",
  "4-16": "/rd-multiple-kist-voucher",
  "5-9": "/loan-advancement",
  "5-14": "/loan-expense",
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
