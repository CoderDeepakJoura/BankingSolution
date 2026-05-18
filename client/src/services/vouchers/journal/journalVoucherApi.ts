import { ApiService, ApiResponse } from '../../api';

export interface JournalVoucherEntryDTO {
  accountId: number;
  accountType: number;
  entryType: "Cr" | "Dr";
  amount: number;
}

export interface JournalVoucherDTO {
  brID: number;
  voucherDate: string;
  voucherNarration?: string;
  entries: JournalVoucherEntryDTO[];
}

export interface JournalVoucherResponse {
  success: boolean;
  message: string;
}

class JournalVoucherApiService extends ApiService {
  constructor() {
    super();
  }

  async addJournalVoucher(data: JournalVoucherDTO): Promise<ApiResponse<JournalVoucherResponse>> {
    return this.makeRequest<JournalVoucherResponse>('/JournalVoucher', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async updateJournalVoucher(voucherId: number, data: JournalVoucherDTO): Promise<ApiResponse<JournalVoucherResponse>> {
    return this.makeRequest<JournalVoucherResponse>(`/JournalVoucher/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default new JournalVoucherApiService();
