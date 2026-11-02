import { ApiService } from '../api';

export interface UnpostedCollection {
  collectionId: number;
  agentId: number;
  agentName: string;
  accountId: number;
  accountNo: string;
  accountName: string;
  accType: string;
  amount: number;
  collectionDate: string;
  notes?: string;
}

export interface PostCollectionResult {
  collectionId: number;
  accountNo: string;
  accountName: string;
  amount: number;
  success: boolean;
  error?: string;
  voucherId?: number;
  voucherNo?: number;
}

export interface BatchPostDTO {
  branchId: number;
  collectionIds: number[];
  voucherDate: string;
  narration?: string;
}

class AgentReceiptPostingApiService extends ApiService {
  getUnposted(branchId: number, date?: string, accType?: string) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (accType) params.append('accType', accType);
    const qs = params.toString();
    return this.makeRequest<UnpostedCollection[]>(
      `/agentreceiptposting/unposted/${branchId}${qs ? `?${qs}` : ''}`
    );
  }

  batchPost(dto: BatchPostDTO) {
    return this.makeRequest<PostCollectionResult[]>('/agentreceiptposting/batch-post', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}

export default new AgentReceiptPostingApiService();
