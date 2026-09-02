import { ApiService, ApiResponse } from '../api';

export interface BFDAccountOption {
  accId: number;
  accountName: string;
  accNo: string;
}

export interface BFDDetailItem {
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
  tdsAmount: number;
}

export interface TDSSlabDetail {
  fromAmount: number;
  toAmount: number;
  intRate: number;
}

export interface TDSSlab {
  id: number;
  name: string;
  type: number;
  withPanCard: number;
  details: TDSSlabDetail[];
}

export interface BFDAccountDetailsResponse {
  account: { accId: number; accountName: string; accNo: string; headCode: number };
  details: BFDDetailItem[];
  tdsSlabs: TDSSlab[];
  tdsSetting: { tdsAccId: number } | null;
  intIncomeSetting: { intIncomeAccId: number } | null;
}

export interface BFDIntIncomeSettingItem {
  id: number;
  headCode: number;
  intIncomeAccId: number;
}

export interface BankFDMatureRequestDTO {
  branchId: number;
  accId: number;
  detailId: number;
  voucherDate: string;
  payoutAccId: number;
  intIncomeAccId: number;
  tDSAmount: number;
  tDSAccId: number | null;
  narration: string;
  isRenew: boolean;
  renewMonths: number;
  renewDays: number;
  renewMaturityAmount: number;
  overrideMaturityAmount?: number;
}

export interface BankFDPreMatureRequestDTO {
  branchId: number;
  accId: number;
  detailId: number;
  voucherDate: string;
  payoutAccId: number;
  intIncomeAccId: number;
  tDSAmount: number;
  tDSAccId: number | null;
  narration: string;
  penaltyRate: number;
  effectiveRate: number;
  preMatureAmount: number;
}

class BankFDMatureApiService extends ApiService {
  async getMaturedAccounts(branchId: number, voucherDate: string): Promise<ApiResponse<BFDAccountOption[]>> {
    return this.makeRequest(`/BankFDMature/${branchId}/accounts?voucherDate=${voucherDate}`);
  }

  async getAllActiveAccounts(branchId: number): Promise<ApiResponse<BFDAccountOption[]>> {
    return this.makeRequest(`/BankFDMature/${branchId}/all-accounts`);
  }

  async getAccountDetails(branchId: number, accId: number, voucherDate: string, premature: boolean): Promise<ApiResponse<BFDAccountDetailsResponse>> {
    return this.makeRequest(`/BankFDMature/${branchId}/account/${accId}/details?voucherDate=${voucherDate}&premature=${premature}`);
  }

  async mature(dto: BankFDMatureRequestDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/BankFDMature/mature', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async premature(dto: BankFDPreMatureRequestDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/BankFDMature/premature', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getInterestIncomeSettingByHeadId(branchId: number, headId: number): Promise<ApiResponse<{ intIncomeAccId: number | null }>> {
    return this.makeRequest(`/BankFDMature/${branchId}/interest-income-setting-by-headid/${headId}`);
  }

  async getInterestIncomeSettings(branchId: number): Promise<ApiResponse<BFDIntIncomeSettingItem[]>> {
    return this.makeRequest(`/BankFDMature/${branchId}/interest-income-settings`);
  }

  async createInterestIncomeSetting(branchId: number, headCode: number, intIncomeAccId: number): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/BankFDMature/${branchId}/interest-income-settings`, {
      method: 'POST',
      body: JSON.stringify({ headCode, intIncomeAccId }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateInterestIncomeSetting(branchId: number, id: number, headCode: number, intIncomeAccId: number): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/BankFDMature/${branchId}/interest-income-settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ headCode, intIncomeAccId }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async deleteInterestIncomeSetting(branchId: number, id: number): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/BankFDMature/${branchId}/interest-income-settings/${id}`, { method: 'DELETE' });
  }
}

export default new BankFDMatureApiService();

// ── TDS calculation helper ──────────────────────────────────────────────────

export function findTDSRate(interest: number, slabs: TDSSlab[], withPan: boolean): number {
  const applicable = slabs.filter(s => (s.withPanCard === 1) === withPan);
  for (const slab of applicable) {
    for (const d of slab.details) {
      if (interest >= d.fromAmount && interest <= d.toAmount) return d.intRate;
    }
  }
  return 0;
}

// ── Maturity amount calculation (mirrors BankFDAccountForm) ─────────────────

export function calcBFDMaturityAmount(
  principal: number,
  rate: number,
  compInterval: number,
  fdDate: string,
  maturityDate: string
): number {
  if (!principal || !rate || !fdDate || !maturityDate) return 0;
  const start = new Date(fdDate);
  const end = new Date(maturityDate);
  const actualDays = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const t = actualDays / 365;
  if (compInterval === 0) return Math.round(principal * (1 + (rate / 100) * t));
  const n = compInterval;
  return Math.round(principal * Math.pow(1 + rate / 100 / n, n * t));
}
