// services/accountheadtype/accountheadtypeapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface AccountHeadTypeFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface AccountHeadType {
  accountHeadTypeId: number ;
  accountHeadTypeName: string;
  accountHeadTypeNameSL: string;
}

export interface accountheadtypeResponse {
  success: boolean;
  accountheadtypes: AccountHeadType[];
  totalCount: number;
}

class accountheadtypeApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_accountheadtype(
    accountheadtypename: string,
    accountheadtypenamesl: string = "",
    branchId : number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/accountheadtype/create_accountheadtype', {
      method: 'POST',
      body: JSON.stringify({ accountheadtypename, accountheadtypenamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async modify_accountheadtype(
    accountheadtypeid : number,
    accountheadtypename: string,
    accountheadtypenamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/accountheadtype/modify_accountheadtype', {
      method: 'POST',
      body: JSON.stringify({accountheadtypeid, accountheadtypename, accountheadtypenamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_accountheadtype(
    accountheadtypeid : number,
    accountheadtypename: string,
    accountheadtypenamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/accountheadtype/delete_accountheadtype', {
      method: 'POST',
      body: JSON.stringify({accountheadtypeid, accountheadtypename, accountheadtypenamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchaccountheadtype(
    filter: AccountHeadTypeFilter,
    branchId: number
  ): Promise<ApiResponse<accountheadtypeResponse>> {
    return this.makeRequest<accountheadtypeResponse>(`/accountheadtype/get_all_accountheadtype/${branchId}`, {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new accountheadtypeApiService(); // ✅ Singleton instance for reuse
