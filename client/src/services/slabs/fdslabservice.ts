// services/interestslab/fdinterestslabservice.ts
import { ApiService, ApiResponse } from "../api";

export interface ResponseDto {
  success: boolean;
  message: string;
}

export interface FDInterestSlabFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface FDInterestSlabDTO {
  id?: number;
  branchId: number;
  fdProductId: number;
  slabName: string;
  applicableDate: string;
  fromDays: number;
  toDays: number;
  compoundingInterval: number;
  fdProductName?: string; // For display purposes
}

// Simplified - No detail DTO needed since we're not using age slabs
export interface CombinedFDIntDTO {
  fdInterestSlab: FDInterestSlabDTO;
  fdInterestSlabDetails: []; // Always empty array
}

export interface FDInterestSlabListResponse {
  success: boolean;
  fdInterestSlabs: CombinedFDIntDTO[];
  totalCount: number;
  message?: string;
}

export interface SingleFDInterestSlabResponse {
  success: boolean;
  data: CombinedFDIntDTO;
  message?: string;
}

class FDSlabService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Create a new FD Interest Slab (Basic Information Only)
   * @param dto - Combined FD Interest Slab DTO
   * @returns Response with success/error message
   */
  async createFDInterestSlab(
    dto: CombinedFDIntDTO
  ): Promise<ApiResponse<ResponseDto>> {
    console.log("FD DTO in service:", dto);
    return this.makeRequest<ResponseDto>("/FDSlab", {
      method: "POST",
      body: JSON.stringify(dto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Update an existing FD Interest Slab (Basic Information Only)
   * @param slabId - ID of the FD Interest Slab to update
   * @param dto - Combined FD Interest Slab DTO with updated data
   * @returns Response with success/error message
   */
  async updateFDInterestSlab(
    slabId: number,
    dto: CombinedFDIntDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/FDSlab/${slabId}`, {
      method: "PUT",
      body: JSON.stringify(dto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Delete an FD Interest Slab
   * @param branchId - Branch ID
   * @param id - ID of the FD Interest Slab to delete
   * @returns Response with success/error message
   */
  async deleteFDInterestSlab(
    branchId: number,
    id: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/FDSlab/${branchId}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Fetch all FD Interest Slabs with pagination and search
   * @param branchId - Branch ID
   * @param filter - Filter criteria including search term, page number, and page size
   * @returns List of FD Interest Slabs with total count
   */
  async fetchFDInterestSlabs(
    branchId: number,
    filter: FDInterestSlabFilter
  ): Promise<ApiResponse<FDInterestSlabListResponse>> {
    return this.makeRequest<FDInterestSlabListResponse>(
      `/FDSlab/get-all-slabs/${branchId}`,
      {
        method: "POST",
        body: JSON.stringify(filter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get a single FD Interest Slab by ID
   * @param id - ID of the FD Interest Slab
   * @param branchId - Branch ID
   * @returns FD Interest Slab basic information
   */
  async getFDInterestSlabById(
    id: number,
    branchId: number
  ): Promise<ApiResponse<SingleFDInterestSlabResponse>> {
    return this.makeRequest<SingleFDInterestSlabResponse>(
      `/FDSlab/get-slab-info/${id}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get FD Interest Slabs by FD Product ID
   * @param fdProductId - FD Product ID
   * @param branchId - Branch ID
   * @returns List of FD Interest Slabs for the specified product
   */
  async getFDInterestSlabsByProduct(
    fdProductId: number,
    branchId: number
  ): Promise<ApiResponse<FDInterestSlabListResponse>> {
    return this.makeRequest<FDInterestSlabListResponse>(
      `/FDSlab/by-product/${fdProductId}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Validate if slab name already exists
   * @param slabName - Slab name to validate
   * @param branchId - Branch ID
   * @param excludeId - ID to exclude from validation (for updates)
   * @returns Boolean indicating if name exists
   */
  async validateSlabName(
    slabName: string,
    branchId: number,
    excludeId?: number
  ): Promise<ApiResponse<{ exists: boolean }>> {
    return this.makeRequest<{ exists: boolean }>(
      `/FDSlab/validate-slab-name`,
      {
        method: "POST",
        body: JSON.stringify({ slabName, branchId, excludeId }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

const fdSlabService = new FDSlabService();
export default fdSlabService;
