import { ApiService, ApiResponse } from "../api";

export interface ServiceTaxRuleDTO {
  id?: number;
  applicableDate: string;
  taxId: number;
  taxName?: string;
}

export interface ServiceTaxTypeDetDTO {
  id?: number;
  date: string;
  taxTypeId: number;
  taxTypeName?: string;
  perc: number;
}

export interface ServiceDTO {
  id?: number;
  branchId: number;
  name?: string;
  sac?: string;
  otherReceipts: number;
  deductRefunds: number;
  penalties: number;
  isIncludeTax: boolean;
  purchaseAccId: number;
  purchaseAccDisplay?: string;
  taxRules: ServiceTaxRuleDTO[];
  taxTypeDets: ServiceTaxTypeDetDTO[];
}

class ServiceApiService extends ApiService {
  async create(dto: ServiceDTO): Promise<ApiResponse> {
    return this.makeRequest("/Service", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: ServiceDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/Service/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/Service/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/Service/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: { searchTerm: string; pageNumber: number; pageSize: number }): Promise<ApiResponse> {
    return this.makeRequest(`/Service/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getList(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/Service/list/${branchId}`);
  }
}

export default new ServiceApiService();
