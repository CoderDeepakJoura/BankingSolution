import { ApiService, ApiResponse } from '../api';

export interface TrialBalanceRow {
  headCode: number;
  headName: string;
  headTypeId: number;
  headTypeName: string;
  drBalance: number;
  crBalance: number;
}

export interface TrialBalance {
  branchName: string;
  branchAddress: string;
  asOfDate: string;
  rows: TrialBalanceRow[];
  totalDr: number;
  totalCr: number;
}

class TrialBalanceApiService extends ApiService {
  async getTrialBalance(branchId: number, asOfDate: string, sessionId = 0): Promise<ApiResponse<TrialBalance>> {
    return this.makeRequest(`/TrialBalance?branchId=${branchId}&asOfDate=${encodeURIComponent(asOfDate)}&sessionId=${sessionId}`);
  }
}

export default new TrialBalanceApiService();
