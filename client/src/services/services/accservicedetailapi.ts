import { ApiService, ApiResponse } from "../api";

export interface AccServiceDetailDTO {
  id?: number;
  branchId: number;
  accId: number;
  serviceId: number;
  accDisplay?: string;
  serviceName?: string;
}

class AccServiceDetailApiService extends ApiService {
  async getAll(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/AccServiceDetail/${branchId}`);
  }

  async add(dto: AccServiceDetailDTO): Promise<ApiResponse> {
    return this.makeRequest("/AccServiceDetail", { method: "POST", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/AccServiceDetail/${branchId}/${id}`, { method: "DELETE" });
  }
}

export default new AccServiceDetailApiService();
