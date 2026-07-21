import { ApiService, ApiResponse } from '../../api';

export interface TaxLineDTO {
  taxTypeId: number;
  taxTypeName?: string;
  perc: number;
  taxAmt: number;
  accId: number;
}

export interface GSTDetailDTO {
  billBookId: number;
  billNo: number;
  stateId: number;
  stateName?: string;
  supplyTypeId: number;
  gstinNo?: string;
  serviceId: number;
  serviceName?: string;
  taxId: number;
  taxName?: string;
  taxLines: TaxLineDTO[];
}

export interface JournalVoucherEntryDTO {
  accountId: number;
  accountType: number;
  entryType: "Cr" | "Dr";
  amount: number;
  totalTax?: number;
  gstDetail?: GSTDetailDTO;
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

export interface JournalVoucherGSTRestoreItemDTO {
  crAccountId: number;
  totalTax: number;
  gstDetail: GSTDetailDTO;
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

  async getGstRestoreDetails(voucherId: number, brId: number): Promise<ApiResponse<JournalVoucherGSTRestoreItemDTO[]>> {
    return this.makeRequest<JournalVoucherGSTRestoreItemDTO[]>(`/JournalVoucher/${voucherId}/gst?brId=${brId}`);
  }
}

export default new JournalVoucherApiService();
