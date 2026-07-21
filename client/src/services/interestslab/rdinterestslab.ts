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

export interface RDInterestSlabDTO {
  id?: number;
  branchId: number;
  rdProductId: number;
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

export interface CombinedRDIntDTO {
  rdInterestSlab: RDInterestSlabDTO;
  rdInterestSlabDetails: InterestSlabDetailsDTO[];
}

export interface InterestSlabListResponse {
  success: boolean;
  rdInterestSlabs: CombinedRDIntDTO[];
  totalCount: number;
}

export interface SingleInterestSlabResponse {
  success: boolean;
  data: CombinedRDIntDTO;
}

class InterestSlabService extends ApiService {
  constructor() {
    super();
  }

  async createInterestSlab(
    dto: CombinedRDIntDTO
  ): Promise<ApiResponse<ResponseDto>> {

    return this.makeRequest<ResponseDto>("/RDInterestSlab", {
      method: "POST",
      body: JSON.stringify(dto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async updateInterestSlab(
    productId: number,
    dto: CombinedRDIntDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/RDInterestSlab/${productId}`, {
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
    return this.makeRequest<ResponseDto>(`/RDInterestSlab/${branchId}/${id}`, {
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
      `/RDInterestSlab/get-all-slabs/${branchId}`,
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
      `/RDInterestSlab/get-slab-info/${id}/${branchId}`,
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
