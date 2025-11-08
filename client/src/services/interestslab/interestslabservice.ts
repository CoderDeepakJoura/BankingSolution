// services/interestslab/interestslabservice.ts
import { ApiService, ApiResponse } from "../api";

export interface ResponseDto {
  success: boolean;
  message: string;
}
export interface InterestSlabFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface SavingInterestSlabDTO {
  id?: number;
  branchId: number;
  savingProductId: number;
  slabName: string;
  applicableDate: string;
}

export interface InterestSlabDetailsDTO {
  id?: number;
  interestSlabId: number;
  branchId: number;
  fromAmount: number;
  toAmount: number;
  interestRate: number;
}

export interface CombinedSavingIntDTO {
  savingInterestSlab: SavingInterestSlabDTO;
  savingInterestSlabDetails: InterestSlabDetailsDTO[];
}

export interface InterestSlabListResponse {
  success: boolean;
  savingInterestSlabs: CombinedSavingIntDTO[];
  totalCount: number;
}

export interface SingleInterestSlabResponse {
  success: boolean;
  data: CombinedSavingIntDTO;
}

class InterestSlabService extends ApiService {
  constructor() {
    super();
  }

  async createInterestSlab(
    dto: CombinedSavingIntDTO
  ): Promise<ApiResponse<ResponseDto>> {
    console.log("DTO in service:", dto);
    return this.makeRequest<ResponseDto>("/SavingInterestSlab", {
      method: "POST",
      body: JSON.stringify(dto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async updateInterestSlab(
    productId: number,
    dto: CombinedSavingIntDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/SavingInterestSlab/${productId}`, {
      method: "PUT",
      body: JSON.stringify(dto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async deleteInterestSlab(
    branchId: number,
    id: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/SavingInterestSlab/${branchId}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async fetchInterestSlabs(
    branchId: number,
    filter: any
  ): Promise<ApiResponse<InterestSlabListResponse>> {
    return this.makeRequest<InterestSlabListResponse>(
      `/SavingInterestSlab/get-all-slabs/${branchId}`,
      {
        method: "POST",
        body: JSON.stringify(filter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async getInterestSlabById(
    id: number,
    branchId: number
  ): Promise<ApiResponse<SingleInterestSlabResponse>> {
    return this.makeRequest<SingleInterestSlabResponse>(
      `/SavingInterestSlab/get-slab-info/${id}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

const interestSlabService = new InterestSlabService();
export default interestSlabService;
