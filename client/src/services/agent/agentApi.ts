import { ApiService } from '../api';

export interface AgentLevel {
  id: number;
  branchId: number;
  code: string;
  description: string;
  parentLevelId?: number | null;
  parentLevelName?: string | null;
}

export interface AgentMaster {
  id: number;
  branchId: number;
  code: string;
  name: string;
  agentLevelId?: number | null;
  agentLevelName?: string | null;
  phone: string;
  address: string;
  isActive: boolean;
}

export interface AccountAgent {
  id: number;
  branchId: number;
  accountId: number;
  accountNo: string;
  accountName: string;
  accType: number;
  accTypeName: string;
  agentId: number;
  agentName: string;
  fromDate: string;
  toDate?: string | null;
}

export interface AgentFilterDTO {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface TransferAgentDTO {
  branchId: number;
  fromAgentId: number;
  toAgentId: number;
  accountIds: number[];
  effectiveDate: string;
}

class AgentApiService extends ApiService {
  // ── Agent Level ──────────────────────────────────────────────────────────
  getAgentLevels(branchId: number, filter: AgentFilterDTO) {
    return this.makeRequest<any>(`/AgentLevel/get-all/${branchId}`, {
      method: 'POST', body: JSON.stringify(filter)
    });
  }
  getAgentLevelDropdown(branchId: number) {
    return this.makeRequest<any>(`/AgentLevel/dropdown/${branchId}`);
  }
  createAgentLevel(dto: Partial<AgentLevel>) {
    return this.makeRequest<any>('/AgentLevel', { method: 'POST', body: JSON.stringify(dto) });
  }
  updateAgentLevel(dto: Partial<AgentLevel>) {
    return this.makeRequest<any>('/AgentLevel', { method: 'PUT', body: JSON.stringify(dto) });
  }
  deleteAgentLevel(id: number, branchId: number) {
    return this.makeRequest<any>(`/AgentLevel/${id}/${branchId}`, { method: 'DELETE' });
  }

  // ── Agent Master ─────────────────────────────────────────────────────────
  getAgents(branchId: number, filter: AgentFilterDTO) {
    return this.makeRequest<any>(`/AgentMaster/get-all/${branchId}`, {
      method: 'POST', body: JSON.stringify(filter)
    });
  }
  getAgentDropdown(branchId: number, activeOnly = true) {
    return this.makeRequest<any>(`/AgentMaster/dropdown/${branchId}?activeOnly=${activeOnly}`);
  }
  createAgent(dto: Partial<AgentMaster>) {
    return this.makeRequest<any>('/AgentMaster', { method: 'POST', body: JSON.stringify(dto) });
  }
  updateAgent(dto: Partial<AgentMaster>) {
    return this.makeRequest<any>('/AgentMaster', { method: 'PUT', body: JSON.stringify(dto) });
  }
  deleteAgent(id: number, branchId: number) {
    return this.makeRequest<any>(`/AgentMaster/${id}/${branchId}`, { method: 'DELETE' });
  }

  // ── Account Agent ────────────────────────────────────────────────────────
  getAccountsByAgent(branchId: number, agentId: number) {
    return this.makeRequest<any>(`/AccountAgent/by-agent/${branchId}/${agentId}`);
  }
  getAccountAgentHistory(branchId: number, accountId: number) {
    return this.makeRequest<any>(`/AccountAgent/history/${branchId}/${accountId}`);
  }
  transferAccounts(dto: TransferAgentDTO) {
    return this.makeRequest<any>('/AccountAgent/transfer', { method: 'POST', body: JSON.stringify(dto) });
  }
  assignAgent(branchId: number, accountId: number, accType: number, agentId: number, fromDate: string) {
    return this.makeRequest<any>('/AccountAgent/assign', {
      method: 'POST',
      body: JSON.stringify({ branchId, accountId, accType, agentId, fromDate })
    });
  }
}

export default new AgentApiService();
