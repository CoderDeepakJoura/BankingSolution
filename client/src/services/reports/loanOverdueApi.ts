import { ApiService, ApiResponse } from '../api';

export interface LoanOverdueProductItem {
  id: number;
  productName: string;
}

export interface LoanOverdueRow {
  accountId: number;
  accountNumber: string;
  accountName: string;
  openingDate: string | null;
  outstandingPrincipal: number;
  outstandingInterest: number;
  overdueAmount: number;
  kistAmount: number;
  overdueInstallments: number;
  guarantor1: string;
  guarantor2: string;
}

export interface LoanOverdueReport {
  branchName: string;
  branchAddress: string;
  asOfDate: string;
  productName: string;
  rows: LoanOverdueRow[];
  totalAccounts: number;
  totalPrincipal: number;
  totalInterest: number;
  totalOverdue: number;
}

class LoanOverdueApiService extends ApiService {
  async getLoanProducts(branchId: number): Promise<ApiResponse<LoanOverdueProductItem[]>> {
    return this.makeRequest(`/LoanOverdue/products?branchId=${branchId}`);
  }

  async getLoanOverdue(
    branchId: number,
    asOfDate: string,
    productId: number,
    overdueOnly: boolean
  ): Promise<ApiResponse<LoanOverdueReport>> {
    return this.makeRequest(
      `/LoanOverdue?branchId=${branchId}&asOfDate=${encodeURIComponent(asOfDate)}&productId=${productId}&overdueOnly=${overdueOnly}`
    );
  }
}

export default new LoanOverdueApiService();
