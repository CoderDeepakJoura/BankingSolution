import { ApiService, ApiResponse } from "../api";

export interface TaxGroupTypeRowDTO {
  taxTypeId: number;
  name?: string;
  code?: string;
  appliedIn?: number;
  calculatedFrom: number;
}

export interface TaxGroupDTO {
  id?: number;
  branchId: number;
  description?: string;
  descriptionSL?: string;
  code?: string;
  printingFormat?: number;
  isStateMandatory: boolean;
  isShippingMandatory: boolean;
  isBillingMandatory: boolean;
  selectedTaxTypeIds: number[];
  taxGroupTypes?: TaxGroupTypeRowDTO[];
}

export interface TaxGroupFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

class TaxGroupApiService extends ApiService {
  async create(dto: TaxGroupDTO): Promise<ApiResponse> {
    return this.makeRequest("/TaxGroup", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: TaxGroupDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxGroup/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxGroup/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxGroup/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: TaxGroupFilter): Promise<ApiResponse> {
    return this.makeRequest(`/TaxGroup/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getList(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/TaxGroup/list/${branchId}`);
  }
}

export default new TaxGroupApiService();
