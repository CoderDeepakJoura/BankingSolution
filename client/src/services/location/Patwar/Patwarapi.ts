// services/Patwar/Patwarapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../../api';
import { API_CONFIG } from '../../../constants/config';

export interface PatwarFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Patwar {
  patwarId: number ;
  description: string;
  descriptionSL: string;
}

export interface PatwarResponse {
  success: boolean;
  Patwars: Patwar[];
  totalCount: number;
}

class PatwarApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_Patwar(
    description: string,
    descriptionSL: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/Patwar', {
      method: 'POST',
      body: JSON.stringify({ description, descriptionSL, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_Patwar(
    Patwarid : number,
    description: string,
    descriptionSL: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/Patwar', {
      method: 'PUT',
      body: JSON.stringify({Patwarid, description, descriptionSL, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_Patwar(
    Patwarid : number,
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>(`/Patwar/${Patwarid}/${branchId}`, {
      method: 'DELETE',
      body: JSON.stringify({Patwarid, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchPatwar(
    filter: PatwarFilter,
    branchid: number
  ): Promise<ApiResponse<PatwarResponse>> {
    return this.makeRequest<PatwarResponse>(`/Patwar/patwars_info/${branchid}`, {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new PatwarApiService(); // ✅ Singleton instance for reuse
