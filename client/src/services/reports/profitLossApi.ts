import { ApiService, ApiResponse } from '../api';

export interface ProfitLossLine {
  headCode: number;
  headName: string;
  typeName: string;
  categoryId: number;
  drTotal: number;
  crTotal: number;
  balance: number;
}

export interface ProfitLossSection {
  typeName: string;
  lines: ProfitLossLine[];
  subTotal: number;
}

export interface ProfitLoss {
  fromDate: string;
  toDate: string;
  branchName: string;
  branchAddress: string;
  incomeSections: ProfitLossSection[];
  expenseSections: ProfitLossSection[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
}

class ProfitLossApiService extends ApiService {
  async getProfitLoss(branchId: number, fromDate: string, toDate: string): Promise<ApiResponse<ProfitLoss>> {
    return this.makeRequest(
      `/ProfitLoss?branchId=${branchId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
    );
  }
}

export default new ProfitLossApiService();
