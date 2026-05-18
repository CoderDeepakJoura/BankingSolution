import { ApiService, ApiResponse } from '../api';

export interface BalanceSheetLine {
  headCode: number;
  headName: string;
  typeName: string;
  categoryId: number;
  drTotal: number;
  crTotal: number;
  balance: number;
}

export interface BalanceSheetSection {
  typeName: string;
  lines: BalanceSheetLine[];
  subTotal: number;
}

export interface BalanceSheet {
  asOfDate: string;
  branchName: string;
  branchAddress: string;
  liabilitySections: BalanceSheetSection[];
  assetSections: BalanceSheetSection[];
  totalLiabilities: number;
  totalAssets: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  grandTotalLiabilities: number;
  grandTotalAssets: number;
}

class BalanceSheetApiService extends ApiService {
  async getBalanceSheet(branchId: number, asOfDate: string): Promise<ApiResponse<BalanceSheet>> {
    return this.makeRequest(`/BalanceSheet?branchId=${branchId}&asOfDate=${encodeURIComponent(asOfDate)}`);
  }
}

export default new BalanceSheetApiService();
