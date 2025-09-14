// services/Relation/relationapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface RelationFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Relation {
  relationId: number ;
  description: string;
  descriptionSL: string;
}

export interface RelationResponse {
  success: boolean;
  relations: Relation[];
  totalCount: number;
}

class relationApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_relation(
    description: string,
    descriptionsl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/relation/create_relation', {
      method: 'POST',
      body: JSON.stringify({ description, descriptionsl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_relation(
    relationid : number,
    description: string,
    descriptionsl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/relation/modify_relation', {
      method: 'POST',
      body: JSON.stringify({relationid, description, descriptionsl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_relation(
    relationid : number,
    description: string,
    descriptionsl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/relation/delete_relation', {
      method: 'POST',
      body: JSON.stringify({relationid, description, descriptionsl }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchrelation(
    filter: RelationFilter
  ): Promise<ApiResponse<RelationResponse>> {
    return this.makeRequest<RelationResponse>('/relation/get_all_relation', {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new relationApiService(); // ✅ Singleton instance for reuse
