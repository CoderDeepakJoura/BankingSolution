import { ApiService, ApiResponse } from "../api";

export interface TaxDetailDTO {
  id?: number;
  branchId?: number;
  taxId?: number;
  detailDate: string;
  taxTypeId: number;
  nRatio: number;
  dRatio: number;
  evaluatedOn: number;
  percentage: number;
  taxTypeName?: string;
  evaluatedOnName?: string;
}

export interface TaxDTO {
  id?: number;
  branchId: number;
  name?: string;
  nameSL?: string;
  alias?: string;
  aliasSL?: string;
  introductionDate: string;
  taxPercentage: number;
  tCId: number;
  taxGroupId?: number;
  taxCategoryName?: string;
  taxGroupName?: string;
  details: TaxDetailDTO[];
}

export interface TaxFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

class TaxApiService extends ApiService {
  async create(dto: TaxDTO): Promise<ApiResponse> {
    return this.makeRequest("/Tax", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: TaxDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/Tax/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/Tax/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/Tax/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: TaxFilter): Promise<ApiResponse> {
    return this.makeRequest(`/Tax/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getList(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/Tax/list/${branchId}`);
  }
}

export default new TaxApiService();
