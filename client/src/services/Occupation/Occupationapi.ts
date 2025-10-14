// services/Occupation/Occupationapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface OccupationFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Occupation {
  occupationId: number ;
  description: string;
  descriptionSL: string;
}

export interface OccupationResponse {
  success: boolean;
  Occupations: Occupation[];
  totalCount: number;
}

class OccupationApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_Occupation(
    description: string,
    descriptionSL: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/Occupation', {
      method: 'POST',
      body: JSON.stringify({ description, descriptionSL, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_Occupation(
    Occupationid : number,
    description: string,
    descriptionSL: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/Occupation', {
      method: 'PUT',
      body: JSON.stringify({Occupationid, description, descriptionSL, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_Occupation(
    Occupationid : number,
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>(`/Occupation/${Occupationid}/${branchId}`, {
      method: 'DELETE',
      body: JSON.stringify({Occupationid, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchOccupation(
    filter: OccupationFilter,
    branchid: number
  ): Promise<ApiResponse<OccupationResponse>> {
    return this.makeRequest<OccupationResponse>(`/Occupation/occupations_info/${branchid}`, {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new OccupationApiService(); // ✅ Singleton instance for reuse
