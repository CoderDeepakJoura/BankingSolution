import { ApiService, ApiResponse } from '../api';

export interface LoanIntCertProduct { id: number; productName: string; }

export interface LoanIntCertAccount {
  id: number;
  accountNumber: string;
  accountName: string;
}

export interface LoanIntCert {
  branchName: string;
  branchAddress: string;
  productName: string;
  accountNo: string;
  accountName: string;
  memberName: string;
  relativeName: string;
  relationName: string;
  addressLine1: string;
  addressLine2: string;
  villageName: string;
  pincode: string;
  limitSanctioned: number;
  interestRate: number;
  interestDebited: number;
  principalRepaid: number;
  interestRepaid: number;
  chargesRepaid: number;
  totalRepaid: number;
  loanDate: string | null;
  fromDate: string;
  toDate: string;
}

class LoanIntCertApiService extends ApiService {
  async getLoanProducts(branchId: number): Promise<ApiResponse<LoanIntCertProduct[]>> {
    return this.makeRequest(`/LoanIntCert/products?branchId=${branchId}`);
  }
  async getLoanAccounts(branchId: number, productId: number): Promise<ApiResponse<LoanIntCertAccount[]>> {
    return this.makeRequest(`/LoanIntCert/accounts?branchId=${branchId}&productId=${productId}`);
  }
  async getLoanIntCert(branchId: number, accountId: number, fromDate: string, toDate: string): Promise<ApiResponse<LoanIntCert>> {
    return this.makeRequest(
      `/LoanIntCert?branchId=${branchId}&accountId=${accountId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
    );
  }
}

export default new LoanIntCertApiService();
