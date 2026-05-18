import { ApiService, ApiResponse } from '../../api';

export interface LoanRecoveryDebitItemDTO {
  accountId: number;
  accountType: number;
  amount: number;
  narration?: string;
}

export interface LoanRecoveryVoucherDTO {
  brId: number;
  loanAccountId: number;
  voucherDate: string;
  totalAmount: number;
  narration?: string;
  agent?: string;
  debitItems: LoanRecoveryDebitItemDTO[];
}

export interface LoanRecoveryBalanceDTO {
  loanAccId: number;
  accountNumber: string;
  memberName: string;
  memberRelativeName?: string;
  phoneNo?: string;
  membershipNo?: string;
  branchName?: string;
  loanNo?: string;
  loanDate?: string;
  standardInterestRate?: number;
  overdueInterestRate?: number;
  kistAmount?: number;
  principalBalance: number;
  stdInterestOutstanding: number;
  penalInterestOutstanding: number;
  stdRecoverableOutstanding: number;
  overdueRecoverableOutstanding: number;
  totalOutstanding: number;
  recoverySeq: string;
  savingBalance: number;

  overdueInstallments: number;
  overduePrincipal: number;
  interestCalcFromDate?: string;
  interestCalcToDate?: string;
  intCalcMethod: string;
}

export interface LoanAccountSearchDTO {
  accountId: number;
  accountNumber: string;
  accountName: string;
  memberId?: number;
}

export interface KistScheduleDTO {
  kistNumber: number;
  date?: string;
  kistAmount: number;
  principalAmt: number;
  interestAmt: number;
}

class LoanRecoveryApiService extends ApiService {
  async searchAccounts(branchId: number, query: string): Promise<ApiResponse<LoanAccountSearchDTO[]>> {
    return this.makeRequest(`/LoanRecovery/search?branchId=${branchId}&query=${encodeURIComponent(query)}`);
  }

  async getBalance(loanAccId: number, branchId: number): Promise<ApiResponse<LoanRecoveryBalanceDTO>> {
    return this.makeRequest(`/LoanRecovery/balance/${loanAccId}/${branchId}`);
  }

  async getKistSchedule(loanAccId: number, branchId: number): Promise<ApiResponse<KistScheduleDTO[]>> {
    return this.makeRequest(`/LoanRecovery/kist-schedule/${loanAccId}/${branchId}`);
  }

  async addRecovery(dto: LoanRecoveryVoucherDTO): Promise<ApiResponse<any>> {
    return this.makeRequest('/LoanRecovery', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new LoanRecoveryApiService();
