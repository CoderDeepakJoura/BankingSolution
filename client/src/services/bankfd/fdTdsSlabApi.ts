import { ApiService, ApiResponse } from '../api';

export interface FDTDSSlabDetailDTO {
  id?: number;
  brId: number;
  slabID: number;
  fromAmount: number;
  toAmount: number;
  intRate: number;
}
export interface FDTDSSlabDTO {
  id?: number;
  brId: number;
  name: string;
  nameSL?: string;
  date: string;
  type: number;
  withPanCard: number;
}
export interface FDTDSSlabWithDetails {
  slab: FDTDSSlabDTO;
  details: FDTDSSlabDetailDTO[];
}
export interface FDTDSSlabListItem {
  id: number;
  brId: number;
  name: string;
  date: string;
  type: number;
  withPanCard: number;
}

class FDTDSSlabApiService extends ApiService {
  async getAll(branchId: number): Promise<ApiResponse<FDTDSSlabListItem[]>> {
    return this.makeRequest(`/FDTDSSlab/${branchId}`);
  }
  async getById(branchId: number, id: number): Promise<ApiResponse<FDTDSSlabWithDetails>> {
    return this.makeRequest(`/FDTDSSlab/${branchId}/${id}`);
  }
  async create(dto: FDTDSSlabWithDetails): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/FDTDSSlab', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  async update(id: number, dto: FDTDSSlabWithDetails): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/FDTDSSlab/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  async remove(branchId: number, id: number): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/FDTDSSlab/${branchId}/${id}`, { method: 'DELETE' });
  }
}
export default new FDTDSSlabApiService();
