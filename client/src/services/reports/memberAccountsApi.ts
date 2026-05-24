import { ApiService, ApiResponse } from '../api';

export interface MemberAccountsListItem {
  id: number;
  memberName: string;
  relativeName: string;
  villageName: string;
  membershipNo: string;
  smAccountNo: string;
  memberType: string;
}

export interface MemberAccountItem {
  accountNo: string;
  accountName: string;
  accType: string;
  productName: string;
  balance: number;
  balType: string;
}

export interface MemberGuarantorInfo {
  productCode: string;
  productName: string;
  loanAccNo: string;
  loanAccName: string;
}

export interface MemberAccountsDetail {
  branchName: string;
  branchAddress: string;
  memberName: string;
  membershipNo: string;
  smAccountNo: string;
  asOnDate: string;
  guarantorDetails: MemberGuarantorInfo[];
  accounts: MemberAccountItem[];
}

class MemberAccountsApiService extends ApiService {
  async searchMembers(branchId: number, searchTerm: string): Promise<ApiResponse<MemberAccountsListItem[]>> {
    return this.makeRequest(
      `/MemberAccounts/search?branchId=${branchId}&searchTerm=${encodeURIComponent(searchTerm)}`
    );
  }

  async getMemberDetail(branchId: number, memberId: number, asOnDate: string): Promise<ApiResponse<MemberAccountsDetail>> {
    return this.makeRequest(
      `/MemberAccounts/detail?branchId=${branchId}&memberId=${memberId}&asOnDate=${encodeURIComponent(asOnDate)}`
    );
  }
}

export default new MemberAccountsApiService();
