// services/interestslab/fdinterestslabservice.ts
import { ApiService, ApiResponse } from "../api";

export interface ResponseDto {
  success: boolean;
  message: string;
}
export interface FDSlabs {
  id: number;
  slabName: string;
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
  productName?: string; // For display purposes
}

export interface FDInterestSlabInfoDTO {
  id?: number;
  branchId: number;
  fdProductId: number;
  applicableDate: string;
  productName?: string; // For display purposes
}

export interface FDInterestSlabDetailDTO {
  id?: number;
  fdIntSlabId: number;
  branchId: number;
  ageFrom: number;
  ageTo: number;
  interestRate: number;
}

export interface CombinedFDIntDTO {
  fdInterestSlab?: FDInterestSlabDTO;
  fdInterestSlabDetails: FDInterestSlabDetailDTO[];
}
export interface CombinedFDIntInfoDTO {
  fdInterestSlabInfo?: FDInterestSlabInfoDTO;
  fdInterestSlabDetails: FDInterestSlabDetailDTO[];
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

class FDInterestSlabService extends ApiService {
  constructor() {
    super();
  }

  async fetchAllFDSlabs(
    branchId: number
    ): Promise<ApiResponse<any>> {
    return this.makeRequest<FDSlabs>(
      `/fetchdata/fd-slabs/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  /**
   * Create a new FD Interest Slab
   * @param dto - Combined FD Interest Slab DTO
   * @returns Response with success/error message
   */
  async createFDInterestSlab(
    dto: CombinedFDIntInfoDTO
  ): Promise<ApiResponse<ResponseDto>> {
    console.log("FD DTO in service:", dto);
    return this.makeRequest<ResponseDto>("/FDInterestSlab", {
      method: "POST",
      body: JSON.stringify(dto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Update an existing FD Interest Slab
   * @param slabId - ID of the FD Interest Slab to update
   * @param dto - Combined FD Interest Slab DTO with updated data
   * @returns Response with success/error message
   */
  async updateFDInterestSlab(
    slabId: number,
    dto: CombinedFDIntInfoDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/FDInterestSlab/${slabId}`, {
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
    return this.makeRequest<ResponseDto>(`/FDInterestSlab/${branchId}/${id}`, {
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
      `/FDInterestSlab/get-all-slabs/${branchId}`,
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
   * @returns FD Interest Slab with all details
   */
  async getFDInterestSlabById(
    id: number,
    branchId: number
  ): Promise<ApiResponse<SingleFDInterestSlabResponse>> {
    return this.makeRequest<SingleFDInterestSlabResponse>(
      `/FDInterestSlab/get-slab-info/${id}/${branchId}`,
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
      `/FDInterestSlab/by-product/${fdProductId}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get applicable interest rate for a specific FD deposit
   * @param fdProductId - FD Product ID
   * @param depositAmount - FD deposit amount
   * @param tenureDays - Tenure in days
   * @param age - Customer age
   * @param branchId - Branch ID
   * @returns Applicable interest rate
   */
  async getApplicableInterestRate(
    fdProductId: number,
    depositAmount: number,
    tenureDays: number,
    age: number,
    branchId: number
  ): Promise<ApiResponse<{ interestRate: number; slabName: string }>> {
    return this.makeRequest<{ interestRate: number; slabName: string }>(
      `/FDInterestSlab/get-applicable-rate`,
      {
        method: "POST",
        body: JSON.stringify({
          fdProductId,
          depositAmount,
          tenureDays,
          age,
          branchId,
        }),
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
      `/FDInterestSlab/validate-slab-name`,
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

const fdInterestSlabService = new FDInterestSlabService();
export default fdInterestSlabService;
