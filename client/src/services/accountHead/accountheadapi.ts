import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface AccountHeadFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface AccountHead {
  accountHeadId: number;
  accountHeadName: string;
  accountHeadNameSL?: string;
  accountHeadTypeId: number;
  accountHeadTypeName?: string;
  accountHeadType?: string;
  headCode?: string;
  HeadCode?: string;
  parentHeadCode?: string;
  parentName?: string;
  parentHeadName?: string;
  isAnnexure?: boolean | string | number;
  showInReport?: boolean | string | number;
  branchId?: number;
  createdDate?: string;
  updatedDate?: string;
  parentId? : number;
}

// Fixed response interface to match your ACTUAL backend response
export interface accountheadResponse {
  success: boolean;
  accountHead: AccountHead[];    // lowercase 'h' as per your logs
  totalCount: number;            // lowercase 't' as per your logs
  message?: string;
}

export interface AddNewAccountHeadPayload {
  AccountHeadName: string;
  AccountHeadNameSL: string;
  ParentHeadCode: string;
  AccountHeadType: string;
  HeadCode: string;
  IsAnnexure: string;
  ShowInReport: string;
  BranchID: number;
  AccountHeadId: number;
}

class accountheadApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_accounthead(
    payload: AddNewAccountHeadPayload
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/accounthead/create_accounthead', {
      method: 'POST', 
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async modify_accounthead(
    accountheadid: number,
    accountheadname: string,
    accountheadnamesl: string = "",
    accountheadcode: string,
    parentid: string = "",
    accountheadtypeid: number,
    isAnnexure: boolean = false,
    showInReport: boolean = false,
    branchId: number 
  ): Promise<ApiResponse<AuthResponse>> {
    const payload = {
      AccountHeadId: accountheadid,
      AccountHeadName: accountheadname,
      AccountHeadNameSL: accountheadnamesl,
      HeadCode: accountheadcode,
      ParentHeadCode: parentid,
      AccountHeadType: accountheadtypeid.toString(),
      IsAnnexure: isAnnexure ? "1" : "0",
      ShowInReport: showInReport ? "1" : "0",
      BranchID: branchId
    };

    return this.makeRequest<AuthResponse>('/accounthead/modify_accounthead', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async delete_accounthead(
    accountheadid: number,
    accountheadname: string,
    accountheadnamesl: string = "",
    accountheadcode: string,
    parentid: string = "",
    accountheadtypeid: number,
    isAnnexure: boolean = false,
    showInReport: boolean = false,
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    const payload = {
      AccountHeadId: accountheadid,
      AccountHeadName: accountheadname,
      AccountHeadNameSL: accountheadnamesl,
      HeadCode: accountheadcode,
      ParentHeadCode: parentid,
      AccountHeadType: accountheadtypeid.toString(),
      IsAnnexure: isAnnexure ? "1" : "0",
      ShowInReport: showInReport ? "1" : "0",
      BranchID: branchId
    };
    return this.makeRequest<AuthResponse>('/accounthead/delete_accounthead', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ✅ Fixed to match your ACTUAL backend response structure
  async fetchaccounthead(
    filter: AccountHeadFilter,
    branchId: number
  ): Promise<ApiResponse<accountheadResponse>> {
    
    
    try {
      const response = await this.makeRequest<any>(`/accounthead/get_all_accounthead/${branchId}`, {
        method: 'POST',
        body: JSON.stringify(filter),
        headers: { 'Content-Type': 'application/json' },
      });
      return response; // Your backend returns the correct structure already
      
    } catch (error) {
      throw error;
    }
  }

  async fetchaccountheadtypes(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/fetchdata/get_all_accountheadtypes', {
      method: 'POST',
      body: JSON.stringify({ BranchId: branchid }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async fetchaccountheads(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/fetchdata/get_all_accountheads', {
      method: 'POST',
      body: JSON.stringify({ BranchId: branchid }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new accountheadApiService();
