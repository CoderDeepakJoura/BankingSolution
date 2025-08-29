// services/PostOffice/PostOfficeapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface PostOfficeFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface PostOffice {
  postOfficeId: number ;
  postOfficeCode: string;
  postOfficeName: string;
  postOfficeNameSL: string;
}

export interface PostOfficeResponse {
  success: boolean;
  PostOffices: PostOffice[];
  totalCount: number;
}

class PostOfficeApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_PostOffice(
    PostOfficename: string,
    PostOfficecode: string,
    PostOfficenamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/PostOffice/create_postOffice', {
      method: 'POST',
      body: JSON.stringify({ PostOfficename, PostOfficecode, PostOfficenamesl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_PostOffice(
    PostOfficeid : number,
    PostOfficename: string,
    PostOfficecode: string,
    PostOfficenamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/PostOffice/modify_postOffice', {
      method: 'POST',
      body: JSON.stringify({PostOfficeid, PostOfficename, PostOfficecode, PostOfficenamesl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_PostOffice(
    PostOfficeid : number,
    PostOfficename: string,
    PostOfficecode: string,
    PostOfficenamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/PostOffice/delete_postOffice', {
      method: 'POST',
      body: JSON.stringify({PostOfficeid, PostOfficename, PostOfficecode, PostOfficenamesl }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchPostOffices(
    filter: PostOfficeFilter
  ): Promise<ApiResponse<PostOfficeResponse>> {
    return this.makeRequest<PostOfficeResponse>('/PostOffice/get_all_postOffices', {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new PostOfficeApiService(); // ✅ Singleton instance for reuse
