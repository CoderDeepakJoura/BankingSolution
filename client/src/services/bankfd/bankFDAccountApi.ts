import { ApiService, ApiResponse } from '../api';

export interface BankFDDetailItemDTO {
  id: number;
  ltdNo: string;
  fdDate: string;
  fdAmount: number;
  fdPeriodMonths: number;
  fdPeriodDays: number;
  intRate: number;
  intCompInterval: number;
  fdMaturityDate: string;
  maturityAmount: number;
  fdStatus: number;
  serialNo?: number;
  openingBalance: number;
  openingBalanceType: string;
  openingBalanceHeadCode?: number;
  openingTDS: number;
  openingTDSHeadCode?: number;
}

export interface CreateBankFDAccountDTO {
  accountId: number;
  branchId: number;
  accountName: string;
  accPrefix: string;
  accSuffix?: number;
  openingDate: string;
  isOpeningEntry: boolean;
  details: BankFDDetailItemDTO[];
  // Voucher — only for non-opening entries
  creditAccountId?: number;
  voucherNarration?: string;
  voucherDate?: string;
  headId?: number;
}

export interface BankFDAccountListItem {
  accId: number;
  accountName: string;
  accNo: string;
  openingDate: string;
  detailCount: number;
  totalFDAmount: number;
}

class BankFDAccountApiService extends ApiService {
  async getAll(branchId: number): Promise<ApiResponse<BankFDAccountListItem[]>> {
    return this.makeRequest(`/BankFDAccount/${branchId}`);
  }
  async getById(branchId: number, accId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/BankFDAccount/${branchId}/${accId}`);
  }
  async create(dto: CreateBankFDAccountDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/BankFDAccount', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  async update(accId: number, dto: CreateBankFDAccountDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/BankFDAccount/${accId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  async remove(branchId: number, accId: number): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/BankFDAccount/${branchId}/${accId}`, { method: 'DELETE' });
  }
  async getLastSuffix(branchId: number): Promise<ApiResponse<{ lastSuffix: number; lastAccNo: string }>> {
    return this.makeRequest(`/BankFDAccount/last-suffix?branchId=${branchId}`);
  }
  async checkSuffix(branchId: number, suffix: number, headId?: number, excludeAccId?: number): Promise<ApiResponse<{ taken: boolean }>> {
    let url = `/BankFDAccount/check-suffix?branchId=${branchId}&suffix=${suffix}`;
    if (headId && headId > 0) url += `&headId=${headId}`;
    if (excludeAccId) url += `&excludeAccId=${excludeAccId}`;
    return this.makeRequest(url);
  }
}
export default new BankFDAccountApiService();
