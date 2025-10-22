// ==================== DTOs ====================
import { AuthResponse, ApiService, ApiResponse } from "../../api";
export interface ResponseDto {
  success: boolean;
  message: string;
}
export interface SavingsProductDTO {
  id?: number;
  branchId: number;
  productName: string;
  productCode: string;
  effectiveFrom: string;
  effectiveTill?: string | null;
  isActive?: boolean;
}

export interface SavingsProductRulesDTO {
  id?: number;
  branchId: number;
  acStatementFrequency: number; // 1=Monthly, 2=Quarterly, 3=Half-Yearly, 4=Yearly, 5=On Demand
  acRetentionDays: number;
  minBalanceAmt: number;
}

export interface SavingsProductPostingHeadsDTO {
  id?: number;
  branchId: number;
  principalBalHeadCode: number;
  suspendedBalHeadCode: number;
  intPayableHeadCode: number;
}

export interface SavingsProductInterestRulesDTO {
  id?: number;
  branchId: number;
  applicableDate: string;
  rateAppliedMethod: number; // 1=Changed Rate, 2=Fixed Rate, 3=Slab Wise Rate
  intApplicableDate: string;
  calculationMethod: number; // 1=Monthly Minimum Balance, 2=Balance Method
  interestRateMinValue: number;
  interestRateMaxValue: number;
  interestVariationMinValue: number;
  interestVariationMaxValue: number;
  minPostingIntAmt: number;
  minBalForPosting: number;
  intPostingInterval: number; // 1=Daily, 2=Monthly, 3=Quarterly, 4=Half Yearly, 5=Yearly
  intPostingDate: number; // 1=Fixed Date, 2=Custom Date
  compoundInterval: number; // 1=Daily, 2=Monthly, 3=Quarterly, 4=Half Yearly, 5=Yearly
  intCompoundDate: number; // 1=Fixed Date, 2=Custom Date
  actionOnIntPosting: number; // 1=Stand, 2=Add In Balance
}

export interface CombinedSavingsDTO {
  savingsProductDTO?: SavingsProductDTO;
  savingsProductRulesDTO?: SavingsProductRulesDTO;
  savingsProductPostingHeadsDTO?: SavingsProductPostingHeadsDTO;
  savingsProductInterestRulesDTO?: SavingsProductInterestRulesDTO;
}

// ==================== Filter Interface ====================

export interface SavingProductFilter {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  isActive?: boolean;
}

// ==================== Response Interface ====================

export interface SavingFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}
export interface SavingResponse {
  success: boolean;
  members: CombinedSavingsDTO[];
  totalCount: number;
}
// ==================== API Service ====================

class SavingProductApiService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Create a new member
   */
  async createSavingProduct(
    combinedSavingDTO: CombinedSavingsDTO
  ): Promise<ApiResponse<ResponseDto>> {
    console.log(JSON.stringify(combinedSavingDTO));
    
    return this.makeRequest<ResponseDto>("/savingsproduct", {
      method: "POST",
      body:  JSON.stringify(combinedSavingDTO),
    });
  }

  async updateSavingProduct(
    combinedSavingDTO: CombinedSavingsDTO, productId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/savingsproduct/${productId}`, {
      method: "PUT",
      body: JSON.stringify(combinedSavingDTO),
    });
  }

  async deleteSavingProduct(
    productId: number,
    branchId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(
      `/savingsproduct/${branchId}/${productId}`,
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
  async fetchSavingProducts(
    filter: SavingFilter,
    branchId: number
  ): Promise<ApiResponse<SavingResponse>> {
    return this.makeRequest<SavingResponse>(
      `/savingsproduct/get-all-products/${branchId}`,
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
  async getSavingProductById(
    productId: number,
    branchId: number
  ): Promise<ApiResponse<CombinedSavingsDTO>> {
    return this.makeRequest<CombinedSavingsDTO>(
      `/savingsproduct/get-product-info/${productId}/${branchId}`,
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
export default new SavingProductApiService();
