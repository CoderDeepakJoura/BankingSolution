// services/thana/thanaapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface ThanaFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface thana {
  thanaId: number ;
  thanaCode: string;
  thanaName: string;
  thanaNameSL: string;
}

export interface thanaResponse {
  success: boolean;
  thanas: thana[];
  totalCount: number;
}

class thanaApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_thana(
    thananame: string,
    thanacode: string,
    thananamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/thanamaster/create_thana', {
      method: 'POST',
      body: JSON.stringify({ thananame, thanacode, thananamesl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_thana(
    thanaid : number,
    thananame: string,
    thanacode: string,
    thananamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/thanamaster/modify_thana', {
      method: 'POST',
      body: JSON.stringify({thanaid, thananame, thanacode, thananamesl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_thana(
    thanaid : number,
    thananame: string,
    thanacode: string,
    thananamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/thanamaster/delete_thana', {
      method: 'POST',
      body: JSON.stringify({thanaid, thananame, thanacode, thananamesl }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchthanas(
    filter: ThanaFilter
  ): Promise<ApiResponse<thanaResponse>> {
    return this.makeRequest<thanaResponse>('/thanamaster/get_all_thanas', {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new thanaApiService(); // ✅ Singleton instance for reuse
