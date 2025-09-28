// services/caste/casteapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface CasteFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Caste {
  casteId: number ;
  casteDescription: string;
  casteDescriptionSL: string;
  categoryId: number | null;
  categoryName: string | null;
}

export interface casteResponse {
  success: boolean;
  castes: Caste[];
  totalCount: number;
}

class casteApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_caste(
    CasteDescription: string,
    CasteDescriptionSl: string = "",
    categoryId: number,
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    
    return this.makeRequest<AuthResponse>('/caste', {
      method: 'POST',
      body: JSON.stringify({ CasteDescription , CasteDescriptionSl, categoryId, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async modify_caste(
    casteid : number,
    casteDescription: string,
    casteDescriptionsl: string = "",
    categoryId: number,
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/caste', {
      method: 'PUT',
      body: JSON.stringify({casteid, casteDescription, casteDescriptionsl, categoryId, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_caste(
    casteid : number,
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>(`/caste/${casteid}/${branchId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchcaste(
    filter: CasteFilter,
    branchid: number
  ): Promise<ApiResponse<casteResponse>> {
    return this.makeRequest<casteResponse>(`/caste/get_all_caste/${branchid}`, {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  
  
}


export default new casteApiService(); // ✅ Singleton instance for reuse
