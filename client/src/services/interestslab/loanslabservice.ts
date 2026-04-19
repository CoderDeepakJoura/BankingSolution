import { ApiService, ApiResponse } from "../api";

export interface LoanSlabFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface LoanSlabDTO {
  id?: number;
  brId: number;
  loanProductId: number;
  name: string;
  nameSL?: string;
  date: string;
  productName?: string;
}

export interface LoanSlabDetailDTO {
  id?: number;
  brId: number;
  slabId: number;
  fromAmount: number;
  toAmount: number;
  periodFrom?: number;
  periodTo?: number;
  periodFromInDays?: number;
  periodToInDays?: number;
  stdIntRate?: number;
  penalIntRate?: number;
}

export interface CombinedLoanSlabDTO {
  loanSlab: LoanSlabDTO;
  loanSlabDetails: LoanSlabDetailDTO[];
}

export interface LoanSlabListResponse {
  success: boolean;
  loanSlabs: CombinedLoanSlabDTO[];
  totalCount: number;
}

export interface SingleLoanSlabResponse {
  success: boolean;
  data: CombinedLoanSlabDTO;
}

export interface ResponseDto {
  success: boolean;
  message: string;
}

class LoanSlabService extends ApiService {
  constructor() {
    super();
  }

  async createLoanSlab(dto: CombinedLoanSlabDTO): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>("/LoanSlab", {
      method: "POST",
      body: JSON.stringify(dto),
      headers: { "Content-Type": "application/json" },
    });
  }

  async updateLoanSlab(slabId: number, dto: CombinedLoanSlabDTO): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/LoanSlab/${slabId}`, {
      method: "PUT",
      body: JSON.stringify(dto),
      headers: { "Content-Type": "application/json" },
    });
  }

  async deleteLoanSlab(brId: number, id: number): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/LoanSlab/${brId}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
  }

  async fetchLoanSlabs(brId: number, filter: LoanSlabFilter): Promise<ApiResponse<LoanSlabListResponse>> {
    return this.makeRequest<LoanSlabListResponse>(`/LoanSlab/get-all-slabs/${brId}`, {
      method: "POST",
      body: JSON.stringify(filter),
      headers: { "Content-Type": "application/json" },
    });
  }

  async getLoanSlabById(id: number, brId: number): Promise<ApiResponse<SingleLoanSlabResponse>> {
    return this.makeRequest<SingleLoanSlabResponse>(`/LoanSlab/get-slab-info/${id}/${brId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  }
}

const loanSlabService = new LoanSlabService();
export default loanSlabService;
