import { ApiService, ApiResponse } from "../../api";

export interface ResponseDto {
  success: boolean;
  message: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface LoanProductDTO {
  id?: number;
  branchId: number;
  code: string;
  productName: string;
  nameSL?: string;
  effectiveFrom: string;
}

export interface LoanProductDefinitionDTO {
  id?: number;
  branchId: number;
  productId?: number;
  typeId: number;
  categoryId?: number;
  securityIds: string;
  secReviewFreqPeriod: number;
  docPlanId?: number;
  intSchedule?: number;
  intFormulae?: number;
  actOnIntPosting?: number;
}

export interface LoanProductAdvancementDTO {
  id?: number;
  branchId: number;
  productId?: number;
  disbursmentMode: string;
  maxNoofDisbursments: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  isShareMoneyReq: string;
  loanPeriodType?: string;
  overDraftLimit: number;
  loanAmtPerOnSecurityRD?: number;
  loanAmtPerOnSecurityFD?: number;
}

export interface LoanProductMarginMoneyRuleDTO {
  id?: number;
  branchId: number;
  advId?: number;
  ratioOrPerc: number;
  loanProportion: number;
  marginProportion: number;
  mmPercentage: number;
}

export interface LoanProductPostingDTO {
  id?: number;
  branchId: number;
  productId?: number;
  principalBalHeadCode: number;
  miscIncHeadCode: number;
  minBalLeftLimitHeadCode: number;
  minBalGivenLimitHeadCode: number;
  expHeadCode: number;
  recoverableIntHeadCode?: number;
}

export interface LoanProductRecoveryDTO {
  id?: number;
  branchId: number;
  productId?: number;
  recoveryMode: string;
  minBalLeftLimit: number;
  minBalGivenLimit: number;
  overDueInterestSeq: number;
  standardInterestSeq: number;
  overDueBalanceSeq: number;
  standardBalanceSeq: number;
  applyOvrIntOn?: string;
  intRecoveredInAdvance: number;
  intPostingInterval: number;
  stdOverdueOnKistDate: number;
  recoveryAdjustmentSeq: number;
}

export interface CombinedLoanProductDTO {
  loanProductDTO?: LoanProductDTO;
  loanProductDefinitionDTO?: LoanProductDefinitionDTO;
  loanProductAdvancementDTO?: LoanProductAdvancementDTO;
  loanProductMarginMoneyRuleDTO?: LoanProductMarginMoneyRuleDTO;
  loanProductPostingDTO?: LoanProductPostingDTO;
  loanProductRecoveryDTO?: LoanProductRecoveryDTO;
}

export interface LoanProductFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface LoanProductListResponse {
  success: boolean;
  loanProducts: CombinedLoanProductDTO[];
  totalCount: number;
}

// ─── API Service ───────────────────────────────────────────────────────────────

class LoanProductApiService extends ApiService {
  async createLoanProduct(dto: CombinedLoanProductDTO): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>("/loanproduct", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async updateLoanProduct(dto: CombinedLoanProductDTO, productId: number): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/loanproduct/${productId}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    });
  }

  async deleteLoanProduct(productId: number, branchId: number): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/loanproduct/${branchId}/${productId}`, {
      method: "DELETE",
    });
  }

  async fetchLoanProducts(filter: LoanProductFilter, branchId: number): Promise<ApiResponse<LoanProductListResponse>> {
    return this.makeRequest<LoanProductListResponse>(`/loanproduct/get-all-products/${branchId}`, {
      method: "POST",
      body: JSON.stringify(filter),
    });
  }

  async getLoanProductById(productId: number, branchId: number): Promise<ApiResponse<CombinedLoanProductDTO>> {
    return this.makeRequest<CombinedLoanProductDTO>(`/loanproduct/get-product-info/${productId}/${branchId}`, {
      method: "GET",
    });
  }
}

export default new LoanProductApiService();
