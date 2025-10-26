// services/interestslab/interestslabservice.ts
import { ApiService, ApiResponse } from "../api";

// Response interfaces
export interface ResponseDto {
  success: boolean;
  message: string;
}

// Interest Slab Filter for search/pagination
export interface InterestSlabFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

// Interest Slab Item DTO
export interface InterestSlabItemDTO {
  slabNo: number;
  fromAmount: number;
  toAmount: number;
  interestRate: number;
}

// Main Interest Slab DTO (exactly matching your C# DTO)
export interface SavingAccountInterestSlabDTO {
  id?: number; // Nullable for new records
  branchId: number;
  savingProductId: number;
  applicableDate: string; // ISO date string (YYYY-MM-DD)
  interestSlabs: InterestSlabItemDTO[];
}

// Interest Slab Response for list operations
export interface InterestSlabResponse {
  success: boolean;
  data: SavingAccountInterestSlabDTO[];
  totalCount: number;
}

// Single Interest Slab Response
export interface SingleInterestSlabResponse {
  success: boolean;
  data: SavingAccountInterestSlabDTO;
}

class InterestSlabService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Create a new interest slab
   */
  async createInterestSlab(
    interestSlabDTO: SavingAccountInterestSlabDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>("/interest-slab", {
      method: "POST",
      body: JSON.stringify(interestSlabDTO),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Update an existing interest slab
   */
  async updateInterestSlab(
    interestSlabDTO: SavingAccountInterestSlabDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>("/interest-slab", {
      method: "PUT",
      body: JSON.stringify(interestSlabDTO),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Delete an interest slab
   */
  async deleteInterestSlab(
    slabId: number,
    branchId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(
      `/interest-slab/${slabId}/${branchId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get all interest slabs with filtering
   */
  async fetchInterestSlabs(
    filter: InterestSlabFilter,
    branchId: number
  ): Promise<ApiResponse<InterestSlabResponse>> {
    return this.makeRequest<InterestSlabResponse>(
      `/interest-slab/get-all/${branchId}`,
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
   * Get interest slab by ID
   */
  async getInterestSlabById(
    slabId: number,
    branchId: number
  ): Promise<ApiResponse<SingleInterestSlabResponse>> {
    return this.makeRequest<SingleInterestSlabResponse>(
      `/interest-slab/${slabId}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get interest slabs by product ID
   */
  async getInterestSlabsByProduct(
    productId: number,
    branchId: number
  ): Promise<ApiResponse<InterestSlabResponse>> {
    return this.makeRequest<InterestSlabResponse>(
      `/interest-slab/by-product/${productId}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get active interest slab for a product (latest by applicable date)
   */
  async getActiveInterestSlab(
    productId: number,
    branchId: number,
    date?: string // Optional date parameter (YYYY-MM-DD), defaults to today on backend
  ): Promise<ApiResponse<SingleInterestSlabResponse>> {
    const dateParam = date ? `?date=${date}` : "";
    return this.makeRequest<SingleInterestSlabResponse>(
      `/interest-slab/active/${productId}/${branchId}${dateParam}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Check if interest slab exists for a product on a specific date
   */
  async checkSlabExists(
    productId: number,
    branchId: number,
    date: string
  ): Promise<ApiResponse<{ exists: boolean }>> {
    return this.makeRequest<{ exists: boolean }>(
      `/interest-slab/check-exists/${productId}/${branchId}?date=${date}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// ✅ Export singleton instance for reuse
const interestSlabService = new InterestSlabService();
export default interestSlabService;
