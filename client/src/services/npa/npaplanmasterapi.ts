import { ApiService, ApiResponse } from "../api";

export interface NPAPlanMasterDTO {
  id?: number;
  branchId: number;
  code: string;
  description?: string;
  calNPADate: number;
  ovrDuePeriodOrInst: number;
  calNPAFromLoanDate: number;
}

export interface NPAPlanMasterListItem {
  id: number;
  code: string;
  description?: string;
}

export interface NPAPlanMasterFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface NPAPlanMasterListResponse {
  success: boolean;
  items: NPAPlanMasterDTO[];
  totalCount: number;
}

class NPAPlanMasterApiService extends ApiService {
  async create(dto: NPAPlanMasterDTO): Promise<ApiResponse> {
    return this.makeRequest("/NPAPlanMaster", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: NPAPlanMasterDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/NPAPlanMaster/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/NPAPlanMaster/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse<{ data: NPAPlanMasterDTO }>> {
    return this.makeRequest(`/NPAPlanMaster/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: NPAPlanMasterFilter): Promise<ApiResponse<NPAPlanMasterListResponse>> {
    return this.makeRequest(`/NPAPlanMaster/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getList(branchId: number): Promise<ApiResponse<{ items: NPAPlanMasterListItem[] }>> {
    return this.makeRequest(`/NPAPlanMaster/list/${branchId}`);
  }
}

export default new NPAPlanMasterApiService();
