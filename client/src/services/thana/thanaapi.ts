// services/thana/thanaapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface ThanaFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Thana {
  thanaId: number ;
  thanaCode: string;
  thanaName: string;
  thanaNameSL: string;
}

export interface thanaResponse {
  success: boolean;
  thanas: Thana[];
  totalCount: number;
}

class thanaApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_thana(
    thananame: string,
    thanacode: string,
    thananamesl: string = "",
    branchId : number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/thana/create_thana', {
      method: 'POST',
      body: JSON.stringify({ thananame, thanacode, thananamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_thana(
    thanaid : number,
    thananame: string,
    thanacode: string,
    thananamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/thana/modify_thana', {
      method: 'POST',
      body: JSON.stringify({thanaid, thananame, thanacode, thananamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_thana(
    thanaid : number,
    thananame: string,
    thanacode: string,
    thananamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/thana/delete_thana', {
      method: 'POST',
      body: JSON.stringify({thanaid, thananame, thanacode, thananamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchthanas(
    filter: ThanaFilter,
    branchId: number
  ): Promise<ApiResponse<thanaResponse>> {
    return this.makeRequest<thanaResponse>(`/thana/get_all_thanas/${branchId}`, {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new thanaApiService(); // ✅ Singleton instance for reuse
