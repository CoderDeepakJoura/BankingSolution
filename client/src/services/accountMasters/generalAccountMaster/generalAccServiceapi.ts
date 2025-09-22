// services/generalAccounts/generalAccountApi.ts

import { ApiService, ApiResponse } from '../../api';
import { API_CONFIG } from '../../../constants/config';

// Filters (same as LocationFilterDTO in backend)
export interface GeneralAccountFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

// DTOs matching backend
export interface AccountMasterDTO {
  accId?: number;
  branchId: number;
  headId: number;
  headCode: string;
  accTypeId?: number;
  generalProductId?: number;
  accountNumber: string;
  accPrefix?: string;
  accSuffix?: string;
  accountName: string;
  accountNameSL?: string;
  memberId?: number;
  memberBranchId?: number;
  accOpeningDate: string;
  isAccClosed?: boolean;
  closingDate?: string;
  closingRemarks?: string;
  isAccAddedManually?: boolean;
  isJointAccount?: boolean;
  isSuspenseAccount?: boolean;
  headName?: string;
}

export interface GSTInfoDTO {
  gstInfoId?: number;
  branchId: number;
  accId: number;
  stateId: number;
  gstInNo: string;
  stateName?: string;
}

export interface CommonAccMasterDTO {
  accountMasterDTO: AccountMasterDTO;
  gstInfoDTO?: GSTInfoDTO;
}

export interface GeneralAccountsResponse {
  success: boolean;
  accounts: CommonAccMasterDTO[];
  totalCount: number;
}

export interface GeneralAccountResponse {
  success: boolean;
  message: string;
}

class GeneralAccountApiService extends ApiService {
  constructor() {
    super();
  }

  // Create
  async createGeneralAccount(
    dto: CommonAccMasterDTO
  ): Promise<ApiResponse<GeneralAccountResponse>> {
    return this.makeRequest<GeneralAccountResponse>(
      '/GeneralAccMaster',
      {
        method: 'POST',
        body: JSON.stringify(dto),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get All with filter + pagination
  async fetchGeneralAccounts(
    filter: GeneralAccountFilter,
    branchId: number
  ): Promise<ApiResponse<GeneralAccountsResponse>> {
    return this.makeRequest<GeneralAccountsResponse>(
      `/GeneralAccMaster/get_all_general_accounts/${branchId}`,
      {
        method: 'POST',
        body: JSON.stringify(filter),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Update
  async updateGeneralAccount(
    dto: CommonAccMasterDTO
  ): Promise<ApiResponse<GeneralAccountResponse>> {
    return this.makeRequest<GeneralAccountResponse>(
      '/GeneralAccMaster',
      {
        method: 'PUT',
        body: JSON.stringify(dto),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Delete
  async deleteGeneralAccount(
    id: number,
    branchId: number
  ): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>(
      `/GeneralAccMaster/${id}/${branchId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export default new GeneralAccountApiService(); // ✅ Singleton instance
