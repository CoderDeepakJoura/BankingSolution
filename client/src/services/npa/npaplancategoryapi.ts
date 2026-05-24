import { ApiService, ApiResponse } from "../api";

export interface NPAPlanCategoryDTO {
  id?: number;
  branchId: number;
  parentId?: number | null;
  isGroup?: string;
  planId?: number | null;
  periodFrom?: number | null;
  periodTo?: number | null;
  provisioningPerc?: number | null;
  intMaxPeriod?: number | null;
  description?: string;
  descriptionSL?: string;
  seqNo?: number | null;
  allPrinOverdue: number;
  // read-only
  planCode?: string;
  parentDescription?: string;
}

export interface NPAPlanCategoryFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface NPAPlanCategoryListResponse {
  success: boolean;
  items: NPAPlanCategoryDTO[];
  totalCount: number;
}

class NPAPlanCategoryApiService extends ApiService {
  async create(dto: NPAPlanCategoryDTO): Promise<ApiResponse> {
    return this.makeRequest("/NPAPlanCategory", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: NPAPlanCategoryDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/NPAPlanCategory/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/NPAPlanCategory/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse<{ data: NPAPlanCategoryDTO }>> {
    return this.makeRequest(`/NPAPlanCategory/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: NPAPlanCategoryFilter): Promise<ApiResponse<NPAPlanCategoryListResponse>> {
    return this.makeRequest(`/NPAPlanCategory/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getGroups(branchId: number): Promise<ApiResponse<{ items: NPAPlanCategoryDTO[] }>> {
    return this.makeRequest(`/NPAPlanCategory/groups/${branchId}`);
  }
}

export default new NPAPlanCategoryApiService();
