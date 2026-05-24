import { ApiService, ApiResponse } from "../api";

export interface GSTSettingDTO {
  branchId: number;
  roundOffExpAccId: number;
  roundOffIncAccId: number;
  roundOffExpAccDisplay?: string;
  roundOffIncAccDisplay?: string;
}

class GSTSettingApiService extends ApiService {
  async get(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/GSTSetting/${branchId}`);
  }

  async save(dto: GSTSettingDTO): Promise<ApiResponse> {
    return this.makeRequest("/GSTSetting", { method: "POST", body: JSON.stringify(dto) });
  }
}

export default new GSTSettingApiService();
