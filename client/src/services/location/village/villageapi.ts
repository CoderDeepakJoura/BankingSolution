// services/village/villageapi.ts

import { AuthResponse, ApiService, ApiResponse } from '../../api';
import { API_CONFIG } from '../../../constants/config';

// Updated to follow PascalCase naming convention for interfaces
export interface VillageFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
  branchId?: number; // Added missing branchId
}

// Fixed naming convention - PascalCase for interface names
export interface Village {
  villageId: number;
  villageCode: string;
  villageName: string;
  villageNameSL: string;
  zoneId?: number;
  zoneName?: string; // Added for display purposes
  thanaId?: number;
  thanaName?: string; // Added for display purposes
  postOfficeId?: number;
  postOfficeName?: string; // Added for display purposes
  tehsilId?: number;
  tehsilName?: string; // Added for display purposes
  branchId?: number;
  pinCode?: number;
  patwarName?: string;
  patwarId? : number;
}

// Fixed naming convention - PascalCase for interface names
export interface VillageResponse {
  success: boolean;
  villages: Village[];
  totalCount: number;
  message?: string;
}

// Added interface for create village request
export interface CreateVillageRequest {
  villageName: string;
  villageNameSL?: string;
  zoneId: number;
  thanaId: number;
  postOfficeId: number;
  tehsilId: number;
  branchId: number;
  pincode: number;
  patwarId: number;
}

// Added interface for modify village request
export interface ModifyVillageRequest {
  villageId: number;
  villageName: string;
  villageNameSL?: string;
  zoneId: number;
  thanaId: number;
  postOfficeId: number;
  tehsilId: number;
  branchId: number;
  pinCode: number;
  patwarId: number;
}

// Added interface for delete village request
export interface DeleteVillageRequest {
  villageId: number;
  villageName: string;
  villageCode: string;
  villageNameSL?: string;
  branchId: number;
}

class VillageApiService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Creates a new village with proper parameter naming and order consistency
   * @param villageName - Name of the village
   * @param villageNameSL - Village name in local language (optional)
   * @param zoneId - Zone identifier
   * @param thanaId - Thana identifier
   * @param postOfficeId - Post office identifier
   * @param tehsilId - Tehsil identifier
   * @param branchId - Branch identifier
   * @returns Promise with API response
   */
  async add_new_village(
    villageName: string,
    villageNameSL: string = "",
    zoneId: number,
    thanaId: number,
    postOfficeId: number,
    tehsilId: number,
    branchId: number,
    pincode: number,
    patwarId: number
  ): Promise<ApiResponse<AuthResponse>> {
    const requestBody: CreateVillageRequest = {
      villageName,
      villageNameSL,
      zoneId,
      thanaId,
      postOfficeId,
      tehsilId,
      branchId,
      pincode,
      patwarId
    };

    return this.makeRequest<AuthResponse>('/village/create_village', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Modifies an existing village
   * @param villageId - Village identifier
   * @param villageName - Updated village name
   * @param villageCode - Village code
   * @param villageNameSL - Village name in local language (optional)
   * @param branchId - Branch identifier
   * @returns Promise with API response
   */
  async modifyVillage(
    villageId: number,
    villageName: string,
    villageNameSL: string = "",
    zoneId: number,
    thanaId: number,
    postOfficeId: number,
    tehsilId: number,
    branchId: number,
    pinCode: number,
    patwarId: number
  ): Promise<ApiResponse<AuthResponse>> {
    const requestBody: ModifyVillageRequest = {
      villageId,
      villageName,
      villageNameSL,
      zoneId,
      thanaId,
      postOfficeId,
      tehsilId,
      branchId,
      pinCode,
      patwarId
    };

    return this.makeRequest<AuthResponse>('/village/modify_village', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Deletes a village
   * @param villageId - Village identifier
   * @param villageName - Village name
   * @param villageCode - Village code
   * @param villageNameSL - Village name in local language (optional)
   * @param branchId - Branch identifier
   * @returns Promise with API response
   */
  async deleteVillage(
    villageId: number,
    villageName: string,
    villageCode: string,
    villageNameSL: string = "",
    branchId: number
  ): Promise<ApiResponse<AuthResponse>> {
    const requestBody: DeleteVillageRequest = {
      villageId,
      villageName,
      villageCode,
      villageNameSL,
      branchId
    };

    return this.makeRequest<AuthResponse>('/village/delete_village', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetches villages based on filter criteria
   * @param filter - Filter criteria including pagination and search terms
   * @returns Promise with villages data
   */
  async fetchVillages(
    filter: VillageFilter,
    branchid: number
  ): Promise<ApiResponse<VillageResponse>> {
    return this.makeRequest<VillageResponse>(`/village/get_all_villages/${branchid}`  , {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Gets all villages for a specific branch
   * @param branchId - Branch identifier
   * @returns Promise with villages data
   */
  async getAllVillages(branchId: number): Promise<ApiResponse<VillageResponse>> {
    const filter: VillageFilter = {
      pageNumber: 1,
      pageSize: 1000, // Get all villages
      branchId
    };

    return this.fetchVillages(filter, branchId);
  }

  /**
   * Searches villages by name
   * @param searchTerm - Search term for village name
   * @param branchId - Branch identifier
   * @param pageNumber - Page number for pagination
   * @param pageSize - Number of items per page
   * @returns Promise with filtered villages data
   */
  async searchVillages(
    searchTerm: string,
    branchId: number,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Promise<ApiResponse<VillageResponse>> {
    const filter: VillageFilter = {
      searchTerm,
      pageNumber,
      pageSize,
      branchId
    };

    return this.fetchVillages(filter, branchId);
  }
}

// Export singleton instance for reuse
export default new VillageApiService();
