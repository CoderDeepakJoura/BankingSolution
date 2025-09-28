import { AuthResponse, ApiService, ApiResponse } from '../api';
class commonService extends ApiService {
  constructor() {
    super();
  }
  async get_states() : Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>('/fetchdata/states', {
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async fetchCategory(
    branchid: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(`/fetchdata/categoryinfo/${branchid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export default new commonService()