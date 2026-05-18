import { ApiService, ApiResponse } from '../../api';

export interface AccountMasterDTO {
  accId?: number;
  branchId: number;
  headId: number;
  headCode: number;
  accTypeId: number;
  generalProductId?: number;
  accountNumber: string;
  accPrefix?: string;
  accSuffix?: number;
  accountName: string;
  accountNameSL?: string;
  memberId?: number;
  memberBranchId?: number;
  accOpeningDate: string;
  isAccClosed: boolean;
  isAccAddedManually?: number;
  relativeName?: string;
  gender?: number;
  addedUsing?: string;
  phoneNo1?: string;
  email?: string;
  addressLine?: string;
  dob?: string;
  membershipNo?: string;
}

export interface AccountKistDetailDTO {
  id?: number;
  brId: number;
  accountId: number;
  loanAmountPassed?: number;
  loanPeriod?: number;
  slabId?: number;
  standardInterestRate?: number;
  overdueInterestRate?: number;
  loanDate: string;
  kistInterval?: number;
  kistFirstDate: string;
  kistAmount?: number;
  kistPrinPart?: number;
  kistIntPart?: number;
  loanNo?: string;
  kistWithInterest?: string;
  loanPeriodIndays?: number;
  kistIntervalIndays?: number;
  kislIntAmt?: number;
  marginMoney?: number;
}

export interface AccountKistScheduleDTO {
  id?: number;
  brId: number;
  loanAccId?: number;
  kistNumber?: number;
  date?: string;
  kistAmount?: number;
  principalAmt?: number;
  interestAmt?: number;
  runningPrincipal?: number;
}

export interface AccountLimitDetailDTO {
  id?: number;
  brId: number;
  accountId: number;
  loanNo: string;
  loanDate: string;
  loanAmountPassed: number;
  loanLimitPeriodInMonths: number;
  loanLimitPeriodInDays: number;
  slabId: number;
  standardInterestRate: number;
  overdueInterestRate: number;
}

export interface NomineeDTO {
  id?: number;
  branchId: number;
  accountId: number;
  nomineeName: string;
  nomineeDob: string;
  relationWithAccHolder: number;
  addressLine: string;
  nomineeDate: string;
  isMinor: number;
  nameOfGuardian?: string;
}

export interface LoanAccountGuarantorDTO {
  id?: number;
  brId: number;
  guar1MemId?: number;
  guar1MemBrId: number;
  guar2MemId?: number;
  guar2MemBrId: number;
  witness1MemId?: number;
  wit1MemBrId?: number;
  witness2MemId?: number;
  wit2MemBrId: number;
}

export interface LoanAccOpeningBalanceDTO {
  id?: number;
  branchId: number;
  accId?: number;
  totalBalance?: number;
  balType?: string;
  overDueBal?: number;
  overBalType?: string;
  openInt?: number;
  openIntType?: string;
  openOverInt?: number;
  openOverIntType?: string;
  headCode?: number;
  overDueDate?: string;
}

export interface LoanAccountBalanceDetailDTO {
  id?: number;
  brId: number;
  loanOpenBalId: number;
  accountId: number;
  amountDr: number;
  amountCr: number;
  intDr: number;
  intCr: number;
  date: string;
  valueDate: string;
  status?: string;
  headCode?: number;
}

export interface LoanAccFDPledgeDTO {
  id?: number;
  brId: number;
  loanAccId?: number;
  fDAccId?: number;
  fDAccDetId?: number;
  fDAccNumber?: string;
  fDAmount?: number;
  interest?: number;
  date?: string;
}

export interface LoanAccRDPledgeDTO {
  id?: number;
  brId: number;
  loanAccId?: number;
  rDAccId?: number;
  rDAccDetId?: number;
  rDAccNumber?: string;
  rDAmount?: number;
  interest?: number;
  date?: string;
}

export interface CombinedLoanAccountDTO {
  accountMasterDTO: AccountMasterDTO;
  kistDetail?: AccountKistDetailDTO;
  kistSchedule: AccountKistScheduleDTO[];
  limitDetails: AccountLimitDetailDTO[];
  nominees: NomineeDTO[];
  guarantor?: LoanAccountGuarantorDTO;
  openingBalance?: LoanAccOpeningBalanceDTO;
  openingBalanceDetails: LoanAccountBalanceDetailDTO[];
  fDPledges: LoanAccFDPledgeDTO[];
  rDPledges: LoanAccRDPledgeDTO[];
}

export interface LoanAccountFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface LoanAccListItemDTO {
  accId: number;
  accountNumber: string;
  accountName: string;
  relativeName?: string;
  accOpeningDate: string;
  isAccClosed: boolean;
  productName?: string;
  loanAmountPassed?: number;
  kistAmount?: number;
  loanPeriod?: number;
  standardInterestRate?: number;
  loanType?: string;
}

export interface CalculateScheduleRequestDTO {
  loanAmount: number;
  stdIntRate: number;
  loanPeriod: number;
  kistInterval: number;
  firstKistDate: string;
  intFormulae: number;
  intSchedule: number;
}

export interface ScheduleResponseDTO {
  schedule: AccountKistScheduleDTO[];
  totalInterest: number;
  totalPayable: number;
  kistAmount: number;
  kistIntPart: number;
  kistPrinPart: number;
}

export interface LoanProductInfoDTO {
  typeId: number;
  categoryId?: number;
  securityIds: string;
  intSchedule?: number;
  intFormulae?: number;
  actOnIntPosting?: number;
  loanPeriodType?: string;
  isShareMoneyReq: string;
  minLoanAmount: number;
  maxLoanAmount: number;
  productName: string;
  code: string;
}

class LoanAccountApiService extends ApiService {
  constructor() { super(); }

  async createLoanAccount(dto: CombinedLoanAccountDTO): Promise<ApiResponse<any>> {
    return this.makeRequest('/LoanAccountMaster', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getLoanAccountById(accountId: number, brId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/LoanAccountMaster/${accountId}/${brId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getLoanProductInfo(productId: number, brId: number): Promise<ApiResponse<{ success: boolean; data: LoanProductInfoDTO }>> {
    return this.makeRequest(`/LoanAccountMaster/product-info/${productId}/${brId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getNextAccountNumber(productId: number, brId: number): Promise<ApiResponse<{ success: boolean; data: string }>> {
    return this.makeRequest(`/LoanAccountMaster/next-account-number/${productId}/${brId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async calculateSchedule(req: CalculateScheduleRequestDTO): Promise<ApiResponse<{ success: boolean; data: ScheduleResponseDTO }>> {
    return this.makeRequest('/LoanAccountMaster/calculate-schedule', {
      method: 'POST',
      body: JSON.stringify(req),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateLoanAccount(accountId: number, dto: CombinedLoanAccountDTO): Promise<ApiResponse<any>> {
    return this.makeRequest(`/LoanAccountMaster/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async deleteLoanAccount(accountId: number, brId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/LoanAccountMaster/${accountId}/${brId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async fetchLoanAccounts(filter: LoanAccountFilter, brId: number): Promise<{ success: boolean; data: LoanAccListItemDTO[]; totalCount: number; message: string }> {
    const params = new URLSearchParams({
      pageNumber: String(filter.pageNumber),
      pageSize: String(filter.pageSize),
    });
    if (filter.searchTerm) params.set('searchTerm', filter.searchTerm);

    const res = await this.makeRequest(`/LoanAccountMaster/list/${brId}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.success && (res as any).data) {
      return {
        success: true,
        data: (res as any).data || [],
        totalCount: (res as any).totalCount || 0,
        message: '',
      };
    }
    return { success: false, data: [], totalCount: 0, message: res.message || 'Failed to fetch loan accounts' };
  }
}

export const loanAccountApi = new LoanAccountApiService();
