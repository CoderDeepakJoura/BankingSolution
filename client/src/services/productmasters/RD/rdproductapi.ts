// ==================== DTOs ====================
import { ApiService, ApiResponse } from "../../api";

export interface ResponseDto {
  success: boolean;
  message: string;
}

export interface RdProductDTO {
  id?:             number;
  branchId:        number;
  productName:     string;
  productNameInSL: string;
  productCode:     string;
  effectiveFrom:   string;   // ISO date string
}

export interface RdProductRulesDTO {
  id?:            number;
  branchId:       number;
  productId?:     number;
  documentPlan:   number;
  periodLimitMin: number;
  periodLimitMax: number;
}

export interface RdProductPostingHeadsDTO {
  id?:                  number;
  branchId:             number;
  productId?:           number;
  principalBalHeadCode: number;
  intPayableHeadCode:   number;
}

export interface RdProductInterestRuleDetailDTO {
  id?:                  number;
  branchId:             number;
  productId?:           number;
  applicableDate:       string;   // ISO date string
  postingInterval:      number;
  compoundingInterval:  number;
  interestRateFrom:     number;
  interestRateTo:       number;
  variationFrom:        number;
  variationTo:          number;
  actionOnIntPosting:   number;   // 1 = Add In Balance | 2 = Stand
  intRateOnPrematurity: number;
  postMaturityIntRate:  number;
  minLockInPeriodDays:  number;
}

export interface CombinedRDProductDTO {
  rdProductDTO?:                  RdProductDTO;
  rdProductRulesDTO?:             RdProductRulesDTO;
  rdProductPostingHeadsDTO?:      RdProductPostingHeadsDTO;
  rdProductInterestRulesDetails?: RdProductInterestRuleDetailDTO[];
}

// ==================== Filter Interface ====================

export interface RDFilter {
  searchTerm?: string;
  pageNumber:  number;
  pageSize:    number;
}

// ==================== Response Interface ====================

export interface RDResponse {
  success:    boolean;
  members:    CombinedRDProductDTO[];
  totalCount: number;
}

// ==================== API Service ====================

class RDProductApiService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Create a new RD Product
   */
  async createRDProduct(
    combinedRDDTO: CombinedRDProductDTO
  ): Promise<ApiResponse<ResponseDto>> {


    return this.makeRequest<ResponseDto>("/rdproduct", {
      method: "POST",
      body:   JSON.stringify(combinedRDDTO),
    });
  }

  /**
   * Update an existing RD Product
   */
  async updateRDProduct(
    combinedRDDTO: CombinedRDProductDTO,
    productId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/rdproduct/${productId}`, {
      method: "PUT",
      body:   JSON.stringify(combinedRDDTO),
    });
  }

  /**
   * Delete an RD Product
   */
  async deleteRDProduct(
    productId: number,
    branchId:  number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(
      `/rdproduct/${branchId}/${productId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get all RD Products with filtering and pagination
   */
  async fetchRDProducts(
    filter:   RDFilter,
    branchId: number
  ): Promise<ApiResponse<RDResponse>> {
    return this.makeRequest<RDResponse>(
      `/rdproduct/get-all-products/${branchId}`,
      {
        method: "POST",
        body:   JSON.stringify(filter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get RD Product by ID
   */
  async getRDProductById(
    productId: number,
    branchId:  number
  ): Promise<ApiResponse<CombinedRDProductDTO>> {
    return this.makeRequest<CombinedRDProductDTO>(
      `/rdproduct/get-product-info/${productId}/${branchId}`,
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
export default new RDProductApiService();
