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
  penaltyAmount?: number;
  narration?: string;
  entryDate: string;
  status: string;
  fromBrId: number;
  fromBrName?: string;
  fromBrCode?: string;
  destBrId: number;
  destBrName?: string;
  destBrCode?: string;
  destAccId?: number;
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
  // Expense detail fields (IBLoanExpense vouchers only)
  expenseLoanProductId?: number;
  expenseLoanProductName?: string;
  expenseCategoryId?: number;
  expenseCategoryName?: string;
  expenseAmount?: number;
  expenseTotalTax?: number;
  expenseNetAmount?: number;
  expenseRemarks?: string;
  expenseCrAccountTypeId?: number;
}

export interface IBLoanExpenseStep1Payload {
  brId: number;
  destBrId: number;
  destAccId: number;
  destAccNo: string;
  destAccName: string;
  destMemberId?: number;
  drAccId: number;
  crAccId: number;
  amount: number;          // netAmount (expenseAmount + totalTax)
  loanProductId: number;
  expenseCategoryId: number;
  expenseAmount: number;
  totalTax: number;
  remarks?: string;
  crAccountTypeId: number;
  narration?: string;
  voucherDate: string;
  workingDate: string;
  userId?: string;
  flowType: string;
  gstDetail?: {
    billBookId: number;
    billNo: number;
    stateId: number;
    supplyTypeId: number;
    gstinNo?: string;
    serviceId: number;
    taxId: number;
    taxLines: { taxTypeId: number; taxTypeName: string; perc: number; taxAmt: number; accId: number }[];
  } | null;
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

// Reuse same shape for loan advancement Step 1 (DrAccId = IB-Ref, CrAccId = Cash)
export type IBLoanAdvancementStep1Payload = IBSavingDepositStep1Payload;

export interface IBRDKistStep1Payload {
  brId: number;
  destBrId: number;
  destAccId: number;
  destAccNo: string;
  destAccName: string;
  destMemberId?: number;
  drAccId: number;     // cash account at login branch
  crAccId: number;     // IB reference account at login branch
  amount: number;      // kist amount + penalty
  penaltyAmount: number;
  narration?: string;
  voucherDate: string;
  workingDate: string;
  userId?: string;
  flowType: string;    // "BranchToBranch"
}

export interface IBLoanRecoveryDebitItem {
  accountId: number;
  accountType: number;
  amount: number;
  narration?: string;
}

export interface IBLoanRecoveryStep1Payload {
  brId: number;
  destBrId: number;
  destAccId: number;
  destAccNo: string;
  destAccName: string;
  destMemberId?: number;
  crAccId: number;          // IB-Ref account at login branch (Cr side)
  totalAmount: number;
  debitItems: IBLoanRecoveryDebitItem[];
  loanProductId: number;
  narration?: string;
  voucherDate: string;
  workingDate: string;
  userId?: string;
  flowType: string;         // "HOToBranch" | "BranchToBranch"
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

  // ── IB Loan Advancement ─────────────────────────────────────────────────────

  async createLoanAdvancementStep1(payload: IBLoanAdvancementStep1Payload) {
    return this.makeRequest("/IBVoucher/loan-advancement/step1", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async confirmLoanAdvancementStep2(ibVoucherId: number, payload: { hoBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/loan-advancement/step2/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async completeLoanAdvancementStep3(ibVoucherId: number, payload: { destBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/loan-advancement/step3/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getLoanAdvancementPendingForHO(hoBrId: number) {
    return this.makeRequest(`/IBVoucher/loan-advancement/pending-ho/${hoBrId}`, { method: "GET" });
  }

  async getLoanAdvancementIncomingForBranch(brId: number) {
    return this.makeRequest(`/IBVoucher/loan-advancement/incoming/${brId}`, { method: "GET" });
  }

  // ── IB Loan Expense ─────────────────────────────────────────────────────────

  async createLoanExpenseStep1(payload: IBLoanExpenseStep1Payload) {
    return this.makeRequest("/IBVoucher/loan-expense/step1", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async confirmLoanExpenseStep2(ibVoucherId: number, payload: { hoBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/loan-expense/step2/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async completeLoanExpenseStep3(ibVoucherId: number, payload: { destBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/loan-expense/step3/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getLoanExpensePendingForHO(hoBrId: number) {
    return this.makeRequest(`/IBVoucher/loan-expense/pending-ho/${hoBrId}`, { method: "GET" });
  }

  async getLoanExpenseIncomingForBranch(brId: number) {
    return this.makeRequest(`/IBVoucher/loan-expense/incoming/${brId}`, { method: "GET" });
  }

  // ── IB Pre-Mature FD/RD ─────────────────────────────────────────────────────
  // Step 1 is submitted via FDAccountMaster/premature-fd or RDAccountMaster/premature-rd
  // with IBPreMatureInfo in the payload.

  async confirmPreMatureStep2(ibVoucherId: number, payload: { hoBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/premature/step2/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async completePreMatureStep3(ibVoucherId: number, payload: { destBrId: number; workingDate: string; userId?: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/premature/step3/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getPreMaturePendingForHO(hoBrId: number) {
    return this.makeRequest(`/IBVoucher/premature/pending-ho/${hoBrId}`, { method: "GET" });
  }

  async getPreMatureIncomingForBranch(brId: number) {
    return this.makeRequest(`/IBVoucher/premature/incoming/${brId}`, { method: "GET" });
  }

  // ── IB Mature FD/RD ─────────────────────────────────────────────────────────
  // Step 1 is submitted via FDAccountMaster/mature-fd or RDAccountMaster/mature-rd
  // with IBMatureInfo in the payload.

  async confirmMatureStep2(ibVoucherId: number, payload: { hoBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/mature/step2/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async completeMatureStep3(ibVoucherId: number, payload: { destBrId: number; workingDate: string; userId?: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/mature/step3/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMaturePendingForHO(hoBrId: number) {
    return this.makeRequest(`/IBVoucher/mature/pending-ho/${hoBrId}`, { method: "GET" });
  }

  async getMatureIncomingForBranch(brId: number) {
    return this.makeRequest(`/IBVoucher/mature/incoming/${brId}`, { method: "GET" });
  }

  async getOtherBranchAccounts(brId: number) {
    return this.makeRequest(`/OtherBranchAccount/${brId}`, { method: "GET" });
  }

  // ── IB RD Kist ──────────────────────────────────────────────────────────────

  async createRDKistStep1(payload: IBRDKistStep1Payload) {
    return this.makeRequest("/IBVoucher/rdkist/step1", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async confirmRDKistStep2(ibVoucherId: number, payload: { hoBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/rdkist/step2/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async completeRDKistStep3(ibVoucherId: number, payload: { destBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/rdkist/step3/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getRDKistPendingForHO(hoBrId: number) {
    return this.makeRequest(`/IBVoucher/rdkist/pending-ho/${hoBrId}`, { method: "GET" });
  }

  async getRDKistIncomingForBranch(brId: number) {
    return this.makeRequest(`/IBVoucher/rdkist/incoming/${brId}`, { method: "GET" });
  }

  // ── IB Loan Recovery ────────────────────────────────────────────────────────

  async createLoanRecoveryStep1(payload: IBLoanRecoveryStep1Payload) {
    return this.makeRequest("/IBVoucher/loan-recovery/step1", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async confirmLoanRecoveryStep2(ibVoucherId: number, payload: { hoBrId: number; workingDate: string; narration?: string }) {
    return this.makeRequest(`/IBVoucher/loan-recovery/step2/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async completeLoanRecoveryStep3(ibVoucherId: number, payload: { destBrId: number; workingDate: string; userId?: string; narration?: string; intAmount?: number }) {
    return this.makeRequest(`/IBVoucher/loan-recovery/step3/${ibVoucherId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getLoanRecoveryPendingForHO(hoBrId: number) {
    return this.makeRequest(`/IBVoucher/loan-recovery/pending-ho/${hoBrId}`, { method: "GET" });
  }

  async getLoanRecoveryIncomingForBranch(brId: number) {
    return this.makeRequest(`/IBVoucher/loan-recovery/incoming/${brId}`, { method: "GET" });
  }
}

export default new IBVoucherApiService();
