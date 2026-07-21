import { ApiService, ApiResponse } from '../api';

export interface BFDHeadTDSSetting {
  id: number;
  brId: number;
  headCode: number;
  tdsAccId: number;
}

class BFDTDSSettingApiService extends ApiService {
  async getAll(branchId: number): Promise<ApiResponse<BFDHeadTDSSetting[]>> {
    return this.makeRequest(`/BFDTDSSetting/${branchId}`);
  }
  async save(dto: BFDHeadTDSSetting): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/BFDTDSSetting', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  async remove(branchId: number, id: number): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/BFDTDSSetting/${branchId}/${id}`, { method: 'DELETE' });
  }
}
export default new BFDTDSSettingApiService();
