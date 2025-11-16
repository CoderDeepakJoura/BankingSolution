// services/branch/branchapi.ts

import { AuthResponse, ApiService, ApiResponse } from "../api";
import { API_CONFIG } from "../../constants/config";

export interface BranchFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface Branch {
  id: number;
  societyId: number;
  code: string;
  name: string;
  nameSL?: string;
  addressLine: string;
  addressLineSL?: string;
  addressType?: number;
  stationId: number;
  phonePrefix1: string;
  phoneNo1: string;
  phoneType1: number;
  phonePrefix2?: string;
  phoneNo2?: string;
  phoneType2?: number;
  isMainBranch: boolean;
  sequenceNo?: number;
  emailId: string;
  pincode: string;
  tehsilId: number;
  gstinNo: string;
  gstNoIssueDate: string;
  stateId: number;
  stateName?: string;
}

export interface BranchDTO {
  id: number;
  societyId: number;
  code: string;
  name: string;
  nameSL?: string;
  addressLine: string;
  addressLineSL?: string;
  addressType?: number;
  stationId: number;
  phonePrefix1: string;
  phoneNo1: string;
  phoneType1: number;
  phonePrefix2?: string;
  phoneNo2?: string;
  phoneType2?: number;
  isMainBranch: boolean;
  sequenceNo?: number;
  emailId: string;
  pincode: string;
  tehsilId: number;
  gstinNo: string;
  gstNoIssueDate: string;
  stateId: number;
}

export interface BranchResponse {
  success: boolean;
  branches: Branch[];
  totalCount: number;
}

export interface SingleBranchResponse {
  success: boolean;
  branch: Branch;
}

class BranchApiService extends ApiService {
  constructor() {
    super();
  }

  async add_new_branch(
    branchDto: BranchDTO
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>("/branchmaster", {
      method: "POST",
      body: JSON.stringify(branchDto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async modify_branch(
    branchDto: BranchDTO
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>("/branchmaster", {
      method: "PUT",
      body: JSON.stringify(branchDto),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async delete_branch(
    branchId: number,
    societyId: number
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>(
      `/branchmaster/${branchId}/${societyId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async fetchBranches(
    filter: BranchFilter,
    societyId: number
  ): Promise<ApiResponse<BranchResponse>> {
    return this.makeRequest<BranchResponse>(
      `/branchmaster/get_all_branches/${societyId}`,
      {
        method: "POST",
        body: JSON.stringify(filter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async getBranchById(
    branchId: number,
    societyId: number
  ): Promise<ApiResponse<SingleBranchResponse>> {
    return this.makeRequest<SingleBranchResponse>(
      `/branchmaster/${branchId}/${societyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async getAllBranches(
    societyId: number
  ): Promise<ApiResponse<BranchResponse>> {
    return this.makeRequest<BranchResponse>(`/fetchdata/get_all_branches`, {
      method: "POST",
      body: JSON.stringify({ SocietyId: societyId }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export default new BranchApiService(); // ✅ Singleton instance for reuse
