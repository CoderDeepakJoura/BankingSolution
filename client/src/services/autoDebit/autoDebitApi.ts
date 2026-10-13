import { ApiService, ApiResponse } from '../api';

export interface AutoDebitMandateDTO {
  id: number;
  branchid: number;
  accountid: number;
  accounttype: string;
  isactive: boolean;
  notes?: string;
  createdAt: string;
  accountName: string;
  accountNo: string;
  savingaccountid?: number;
  savingAccName?: string;
  savingAccNo?: string;
}

export interface AutoDebitRunDTO {
  id: number;
  branchid: number;
  runDate: string;
  startTime: string;
  endTime: string;
  totalAccounts: number;
  successCount: number;
  failCount: number;
  status: string;
}

export interface AutoDebitRunDetailDTO {
  id: number;
  accountid: number;
  accountType: string;
  accountNo: string;
  accountName: string;
  amount: number;
  status: string;
  errorMessage?: string;
  voucherId?: number;
}

class AutoDebitApiService extends ApiService {
  async getMandates(branchId: number): Promise<ApiResponse<AutoDebitMandateDTO[]>> {
    return this.makeRequest(`/AutoDebit/mandates/${branchId}`);
  }

  async addMandate(dto: { branchId: number; accountId: number; accountType: string; notes?: string; savingAccountId?: number }): Promise<ApiResponse<{ id: number }>> {
    return this.makeRequest('/AutoDebit/mandates', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async toggleMandate(id: number, branchId: number): Promise<ApiResponse<{ isActive: boolean }>> {
    return this.makeRequest(`/AutoDebit/mandates/${id}/toggle?branchId=${branchId}`, { method: 'PATCH' });
  }

  async deleteMandate(id: number, branchId: number): Promise<ApiResponse<{}>> {
    return this.makeRequest(`/AutoDebit/mandates/${id}?branchId=${branchId}`, { method: 'DELETE' });
  }

  async getHistory(branchId: number, page = 1, pageSize = 20): Promise<ApiResponse<AutoDebitRunDTO[]> & { total?: number }> {
    return this.makeRequest(`/AutoDebit/history/${branchId}?page=${page}&pageSize=${pageSize}`);
  }

  async getRunDetails(branchId: number, runId: number): Promise<ApiResponse<{ run: AutoDebitRunDTO; details: AutoDebitRunDetailDTO[] }>> {
    return this.makeRequest(`/AutoDebit/history/${branchId}/run/${runId}`);
  }

  async runNow(branchId: number): Promise<ApiResponse<{}>> {
    return this.makeRequest(`/AutoDebit/run-now/${branchId}`, { method: 'POST' });
  }
}

export default new AutoDebitApiService();
