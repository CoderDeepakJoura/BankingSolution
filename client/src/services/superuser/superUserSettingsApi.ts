import { ApiService, ApiResponse } from '../api';

export interface SuperUserSettingsDTO {
  branchId: number;
  allowSavingInterestChange: boolean;
  allowFDInterestChange: boolean;
  allowRDInterestChange: boolean;
  allowLoanInterestChange: boolean;
  enableIBTransactions: boolean;
  allowGSTDeduction: boolean;
}

/** @deprecated Use SuperUserSettingsDTO */
export type InterestPostingSettingsDTO = SuperUserSettingsDTO;

class SuperUserSettingsApiService extends ApiService {
  async getSettings(branchId: number): Promise<ApiResponse<SuperUserSettingsDTO>> {
    return this.makeRequest<SuperUserSettingsDTO>(`/SuperUserSettings/${branchId}`);
  }

  async saveSettings(dto: SuperUserSettingsDTO): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('/SuperUserSettings', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** @deprecated Use getSettings */
  async getInterestPostingSettings(branchId: number) { return this.getSettings(branchId); }
  /** @deprecated Use saveSettings */
  async saveInterestPostingSettings(dto: SuperUserSettingsDTO) { return this.saveSettings(dto); }
}

export default new SuperUserSettingsApiService();
