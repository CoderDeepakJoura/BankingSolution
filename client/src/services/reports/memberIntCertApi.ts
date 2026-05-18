import { ApiService, ApiResponse } from '../api';

export interface MemberSearchResult {
  id: number;
  displayName: string;
  membershipNo: string;
}

export interface MemberIntCertRow {
  accountNo: string;
  accountType: string;
  interestAmount: number;
  tdsAmount: number;
}

export interface MemberIntCert {
  branchName: string;
  branchAddress: string;
  memberName: string;
  relativeName: string;
  relationName: string;
  membershipNo: string;
  memberId: number;
  addressLine1: string;
  addressLine2: string;
  villageName: string;
  pincode: string;
  fromDate: string;
  toDate: string;
  financialYear: string;
  rows: MemberIntCertRow[];
  totalInterest: number;
  totalTDS: number;
}

class MemberIntCertApiService extends ApiService {
  async searchMembers(branchId: number, query: string): Promise<ApiResponse<MemberSearchResult[]>> {
    return this.makeRequest(`/MemberIntCert/search-members?branchId=${branchId}&query=${encodeURIComponent(query)}`);
  }

  async getAllMembers(branchId: number): Promise<ApiResponse<MemberSearchResult[]>> {
    return this.makeRequest(`/MemberIntCert/members?branchId=${branchId}`);
  }

  async getMemberIntCert(branchId: number, memberId: number, fromDate: string, toDate: string): Promise<ApiResponse<MemberIntCert>> {
    return this.makeRequest(
      `/MemberIntCert?branchId=${branchId}&memberId=${memberId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
    );
  }
}

export default new MemberIntCertApiService();
