import { ApiService } from "../api";

export interface IBNotificationItem {
  id: number;
  type: "incoming" | "pendingHO";
  voucherType: string;
  amount: number;
  fromBrName?: string;
  destBrName?: string;
  destAccName?: string;
}

export interface IBNotification {
  incomingCount: number;
  pendingHOCount: number;
  items: IBNotificationItem[];
}

export interface IBVoucherListItem {
  id: number;
  voucherType: string;
  flowType: string;   // "HOToBranch" | "BranchToBranch"
  amount: number;
  narration?: string;
  entryDate: string;
  status: string;
  fromBrId: number;
  fromBrName?: string;
  fromBrCode?: string;
  destBrId: number;
  destBrName?: string;
  destBrCode?: string;
  destAccNo: string;
  destAccName?: string;
  step1DrAccName?: string;
  step1CrAccName?: string;
  step2VoucherId?: number;
  step2DrAccName?: string;
  step2CrAccName?: string;
  step3VoucherId?: number;
  step3DrAccName?: string;
  step3CrAccName?: string;
}

export interface IBSavingDepositStep1Payload {
  brId: number;
  destBrId: number;
  destAccId: number;
  destAccNo: string;
  destAccName: string;
  destMemberId?: number;
  drAccId: number;
  crAccId: number;
  amount: number;
  narration?: string;
  voucherDate: string;
  workingDate: string;
  userId?: string;
  flowType: string;  // "HOToBranch" | "BranchToBranch"
}

class IBVoucherApiService extends ApiService {
  constructor() {
    super();
  }

  async createSavingDepositStep1(payload: IBSavingDepositStep1Payload) {
    return this.makeRequest("/IBVoucher/saving-deposit/step1", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createSavingWithdrawalStep1(payload: IBSavingDepositStep1Payload) {
    return this.makeRequest("/IBVoucher/saving-withdrawal/step1", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async confirmStep2(ibVoucherId: number, payload: { hoBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/step2/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async completeStep3(ibVoucherId: number, payload: { destBrId: number; workingDate: string; userId?: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/step3/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getPendingForHO(hoBrId: number) {
    return this.makeRequest(`/IBVoucher/pending-ho/${hoBrId}`, { method: "GET" });
  }

  async getIncomingForBranch(brId: number) {
    return this.makeRequest(`/IBVoucher/incoming/${brId}`, { method: "GET" });
  }

  async getNotifications(brId: number) {
    return this.makeRequest(`/IBVoucher/notifications/${brId}`, { method: "GET" });
  }
}

export default new IBVoucherApiService();
