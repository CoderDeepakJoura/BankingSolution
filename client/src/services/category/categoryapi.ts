// services/category/categoryapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface CategoryFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Category {
  categoryId: number ;
  categoryName: string;
  categoryNameSL: string;
}

export interface categoryResponse {
  success: boolean;
  categorys: Category[];
  totalCount: number;
}

class categoryApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_category(
    categoryname: string,
    categorynamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/categorymaster/create_category', {
      method: 'POST',
      body: JSON.stringify({ categoryname, categorynamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_category(
    categoryid : number,
    categoryname: string,
    categorynamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/categorymaster/modify_category', {
      method: 'POST',
      body: JSON.stringify({categoryid, categoryname, categorynamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_category(
    categoryid : number,
    categoryname: string,
    categorynamesl: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/categorymaster/delete_category', {
      method: 'POST',
      body: JSON.stringify({categoryid, categoryname, categorynamesl, branchId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchcategory(
    filter: CategoryFilter,
    branchid: number
  ): Promise<ApiResponse<categoryResponse>> {
    return this.makeRequest<categoryResponse>(`/categorymaster/get_all_category/${branchid}`, {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new categoryApiService(); // ✅ Singleton instance for reuse
