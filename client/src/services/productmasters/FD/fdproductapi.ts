// ==================== DTOs ====================
import { AuthResponse, ApiService, ApiResponse } from "../../api";
export interface ResponseDto {
  success: boolean;
  message: string;
}
export interface FdProductDTO {
  id?: number;
  branchId: number;
  productName: string;
  productCode: string;
  effectiveFrom: string; // ISO date string
  effectiveTill?: string | null; // ISO date string
  isSeparateFdAccountAllowed?: boolean;
}

export interface FdProductRulesDTO {
  id?: number;
  branchId: number;
  productId?: number;
  intAccountType: number;
  fdMaturityReminderInMonths?: number;
  fdMaturityReminderInDays?: number;
}

export interface FdProductPostingHeadsDTO {
  id?: number;
  branchId: number;
  productId?: number;
  principalBalHeadCode: number;
  suspendedBalHeadCode: number;
  intPayableHeadCode: number;
}

export interface FdProductInterestRulesDTO {
  id?: number;
  branchId: number;
  productId?: number;
  applicableDate: string; // ISO date string
  interestApplicableOn: number;
  interestRateMinValue: number;
  interestRateMaxValue: number;
  interestVariationMinValue: number;
  interestVariationMaxValue: number;
  actionOnIntPosting: number;
  postMaturityIntRateCalculationType: number;
  prematurityCalculationType: number;
  maturityDueNoticeInDays: number;
  intPostingInterval: number;
  intPostingDate: number;
}

export interface CombinedFDDTO {
  fdProductDTO?: FdProductDTO;
  fdProductRulesDTO?: FdProductRulesDTO;
  fdProductPostingHeadsDTO?: FdProductPostingHeadsDTO;
  fdProductInterestRulesDTO?: FdProductInterestRulesDTO;
}

// ==================== Filter Interface ====================

export interface FdProductFilter {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  isActive?: boolean;
}

// ==================== Response Interface ====================

export interface FDFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}
export interface FDResponse {
  success: boolean;
  members: CombinedFDDTO[];
  totalCount: number;
}
// ==================== API Service ====================

class FDProductApiService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Create a new member
   */
  async createFDProduct(
    combinedFDDTO: CombinedFDDTO
  ): Promise<ApiResponse<ResponseDto>> {
    console.log(JSON.stringify(combinedFDDTO));
    
    return this.makeRequest<ResponseDto>("/fdproduct", {
      method: "POST",
      body:  JSON.stringify(combinedFDDTO),
    });
  }

  async updateFDProduct(
    combinedFDDTO: CombinedFDDTO, productId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/fdproduct/${productId}`, {
      method: "PUT",
      body: JSON.stringify(combinedFDDTO),
    });
  }

  async deleteFDProduct(
    productId: number,
    branchId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(
      `/fdproduct/${branchId}/${productId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get all members with filtering
   */
  async fetchFDProducts(
    filter: FDFilter,
    branchId: number
  ): Promise<ApiResponse<FDResponse>> {
    return this.makeRequest<FDResponse>(
      `/fdproduct/get-all-products/${branchId}`,
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
   * Get member by ID
   */
  async getFDProductById(
    productId: number,
    branchId: number
  ): Promise<ApiResponse<CombinedFDDTO>> {
    return this.makeRequest<CombinedFDDTO>(
      `/fdproduct/get-product-info/${productId}/${branchId}`,
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
export default new FDProductApiService();
