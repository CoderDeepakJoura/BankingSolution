import { ApiService, ApiResponse } from "../api";

export interface TaxTypeDTO {
  id?: number;
  branchId: number;
  description?: string;
  descriptionSL?: string;
  code?: string;
  appliedIn?: number;
  isUT?: number;
  calculatedFrom: number;
  seqNo: number;
  inAccId: number;
  outAccId: number;
  inAccDisplay?: string;
  outAccDisplay?: string;
}

export interface AccountLookupDTO {
  id: number;
  accountNumber?: string;
  accountName?: string;
  display?: string;
}

export interface TaxTypeFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

class TaxTypeApiService extends ApiService {
  async getAccountList(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxType/accounts/${branchId}`);
  }

  async create(dto: TaxTypeDTO): Promise<ApiResponse> {
    return this.makeRequest("/TaxType", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: TaxTypeDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxType/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxType/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxType/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: TaxTypeFilter): Promise<ApiResponse> {
    return this.makeRequest(`/TaxType/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getList(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxType/list/${branchId}`);
  }
}

export default new TaxTypeApiService();
