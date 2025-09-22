import { AuthResponse, ApiService, ApiResponse } from '../api';
export interface State {
  stateId: number;
  stateName: string;
}
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
}

export default new commonService()