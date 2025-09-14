// services/tehsil/tehsilapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface TehsilFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Tehsil {
  tehsilId: number ;
  tehsilCode: string;
  tehsilName: string;
  tehsilNameSL: string;
}

export interface tehsilResponse {
  success: boolean;
  tehsils: Tehsil[];
  totalCount: number;
}

class tehsilApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_tehsil(
    tehsilname: string,
    tehsilcode: string,
    tehsilnamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/tehsil/create_tehsil', {
      method: 'POST',
      body: JSON.stringify({ tehsilname, tehsilcode, tehsilnamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_tehsil(
    tehsilid : number,
    tehsilname: string,
    tehsilcode: string,
    tehsilnamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/tehsil/modify_tehsil', {
      method: 'POST',
      body: JSON.stringify({tehsilid, tehsilname, tehsilcode, tehsilnamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_tehsil(
    tehsilid : number,
    tehsilname: string,
    tehsilcode: string,
    tehsilnamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/tehsil/delete_tehsil', {
      method: 'POST',
      body: JSON.stringify({tehsilid, tehsilname, tehsilcode, tehsilnamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchtehsils(
    filter: TehsilFilter,
    branchId: number
  ): Promise<ApiResponse<tehsilResponse>> {
    return this.makeRequest<tehsilResponse>(`/tehsil/get_all_tehsils/${branchId}`, {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  
}


export default new tehsilApiService(); // ✅ Singleton instance for reuse
