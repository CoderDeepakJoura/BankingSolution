import { ApiService, ApiResponse } from '../api';

export interface MemberReportRow {
  branchCode: string;
  memberName: string;
  membershipNo: string;
  hoNo: string;
  relativeName: string;
  relation: string;
  dob: string;
  nomineeName: string;
  nomineeAge: number;
  address: string;
  postOffice: string;
  tehsil: string;
  phoneNo: string;
  joiningDate: string;
  shareBalance: number;
  shareBalType: string;
}

export interface MemberReport {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  rows: MemberReportRow[];
}

class MemberReportApiService extends ApiService {
  async getMemberReport(params: {
    branchId: number;
    memberType?: number;
    villageId?: number;
    gender?: number;
    fromDate: string;
    toDate: string;
    memberStatus?: number;
    fromAmount?: number;
    toAmount?: number;
    postOfficeId?: number;
  }): Promise<ApiResponse<MemberReport>> {
    const {
      branchId,
      memberType = 0,
      villageId = 0,
      gender = 0,
      fromDate,
      toDate,
      memberStatus = 0,
      fromAmount = 0,
      toAmount = 0,
      postOfficeId = 0,
    } = params;

    return this.makeRequest(
      `/MemberReport?branchId=${branchId}` +
      `&memberType=${memberType}` +
      `&villageId=${villageId}` +
      `&gender=${gender}` +
      `&fromDate=${encodeURIComponent(fromDate)}` +
      `&toDate=${encodeURIComponent(toDate)}` +
      `&memberStatus=${memberStatus}` +
      `&fromAmount=${fromAmount}` +
      `&toAmount=${toAmount}` +
      `&postOfficeId=${postOfficeId}`
    );
  }
}

export default new MemberReportApiService();
