import { AuthResponse, ApiService, ApiResponse } from '../api';

class AutomationService extends ApiService {
  constructor() {
    super();
  }

  async run_automation_script(
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/auth/run-script', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new AutomationService();
