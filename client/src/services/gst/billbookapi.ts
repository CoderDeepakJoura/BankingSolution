import { ApiService, ApiResponse } from "../api";

export interface BillBookDTO {
  id?: number;
  branchId: number;
  description?: string;
  billNoPrefix?: string;
  billNoFrom: number;
  billNoGeneration: number; // 1=Financial Year, 2=Continuous
}

export interface BillBookFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

class BillBookApiService extends ApiService {
  async create(dto: BillBookDTO): Promise<ApiResponse> {
    return this.makeRequest("/BillBook", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: BillBookDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/BillBook/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/BillBook/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/BillBook/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: BillBookFilter): Promise<ApiResponse> {
    return this.makeRequest(`/BillBook/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getList(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/BillBook/list/${branchId}`);
  }
}

export default new BillBookApiService();
