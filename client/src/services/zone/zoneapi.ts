// services/zone/zoneapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../api';
import { API_CONFIG } from '../../constants/config';

export interface ZoneFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Zone {
  id: number;
  zonecode: string;
  zonename: string;
  zonenamesl: string;
}

export interface ZoneResponse {
  success: boolean;
  zones: Zone[];
  totalCount: number;
}

class ZoneApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_zone(
    zonename: string,
    zonecode: string,
    zonenamesl: string = ""
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/zonemaster/create_zone', {
      method: 'POST',
      body: JSON.stringify({ zonename, zonecode, zonenamesl }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchZones(
    filter: ZoneFilter
  ): Promise<ApiResponse<ZoneResponse>> {
    return this.makeRequest<ZoneResponse>('/zonemaster/get_all_zones', {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export default new ZoneApiService(); // ✅ Singleton instance for reuse
