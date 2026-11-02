import { ApiService } from '../api';

export interface AgentLoginEntry {
  id: number;
  branchId: number;
  agentMasterId: number;
  agentName: string;
  agentCode: string;
  username: string;
  isSuperAgent: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAgentLoginDTO {
  branchId: number;
  agentMasterId: number;
  username: string;
  password: string;
  isSuperAgent: boolean;
}

export interface ResetAgentPasswordDTO {
  agentLoginId: number;
  branchId: number;
  newPassword: string;
}

export interface ToggleAgentLoginDTO {
  agentLoginId: number;
  branchId: number;
  isActive: boolean;
}

class AgentLoginManagementApiService extends ApiService {
  getAll(branchId: number) {
    return this.makeRequest<AgentLoginEntry[]>(`/agentloginmanagement/${branchId}`);
  }

  create(dto: CreateAgentLoginDTO) {
    return this.makeRequest<any>('/agentloginmanagement', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  resetPassword(dto: ResetAgentPasswordDTO) {
    return this.makeRequest<any>('/agentloginmanagement/reset-password', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  toggle(dto: ToggleAgentLoginDTO) {
    return this.makeRequest<any>('/agentloginmanagement/toggle', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  delete(id: number, branchId: number) {
    return this.makeRequest<any>(`/agentloginmanagement/${id}/${branchId}`, {
      method: 'DELETE',
    });
  }
}

export default new AgentLoginManagementApiService();
