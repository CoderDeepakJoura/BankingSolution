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
    categorynamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/category/create_category', {
      method: 'POST',
      body: JSON.stringify({ categoryname, categorynamesl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async modify_category(
    categoryid : number,
    categoryname: string,
    categorynamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/category/modify_category', {
      method: 'POST',
      body: JSON.stringify({categoryid, categoryname, categorynamesl }),
      headers: {
        'Content-Type': 'application/json',
        
      },
    });
  }

  async delete_category(
    categoryid : number,
    categoryname: string,
    categorynamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/category/delete_category', {
      method: 'POST',
      body: JSON.stringify({categoryid, categoryname, categorynamesl }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchcategory(
    filter: CategoryFilter
  ): Promise<ApiResponse<categoryResponse>> {
    return this.makeRequest<categoryResponse>('/category/get_all_categorys', {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
}


export default new categoryApiService(); // ✅ Singleton instance for reuse
