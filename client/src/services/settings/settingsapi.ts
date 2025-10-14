import { AuthResponse, ApiService, ApiResponse } from "../api";
import { API_CONFIG } from "../../constants/config";
export interface SettingsDTO {
  generalSettings: GeneralSettingsDTO;
  voucherSettings: VoucherSettingsDTO;
}
export interface GeneralSettingsDTO {
  BranchId: number;
  AdmissionFeeAccountId: number;
  AdmissionFeeAmount: number;
}
export interface VoucherSettingsDTO {
  AutoVerification: boolean;
}


class SettingsApiService extends ApiService {
  constructor() {
    super();
  }
  async insert_settings(
    SettingsDTO: SettingsDTO
  ): Promise<ApiResponse<AuthResponse>> {
    console.log(JSON.stringify(SettingsDTO))
    return this.makeRequest<AuthResponse>("/Settings", {
      method: "POST",
      body: JSON.stringify(SettingsDTO),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async fetch_settings(branchId: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(`/Settings/${branchId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
export default new SettingsApiService();
