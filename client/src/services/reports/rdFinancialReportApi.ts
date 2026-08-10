import { ApiService, ApiResponse } from '../api';

export interface RDFinRow {
  accId: number | null;
  name: string;
  periodDr: number;
  periodCr: number;
  /** positive = Cr balance, negative = Dr balance */
  closingBalance: number;
  /** "A" = individual account, "H" = annexure head-level, "" = Cash Head special row */
  accOrHead: "A" | "H" | "";
  headId: number;
  headName: string;
  categoryId: number;
  typeName: string;
}

export interface RDFinancialReport {
  branchName: string;
  branchAddress: string;
  fromDate: string;
  toDate: string;
  showAllClBal: boolean;
  rows: RDFinRow[];
  totalPeriodDr: number;
  totalPeriodCr: number;
  totalClosingCr: number;
  totalClosingDr: number;
}

class RDFinancialReportApiService extends ApiService {
  get(
    branchId: number,
    fromDate: string,
    toDate: string,
    showAllClBal: boolean
  ): Promise<ApiResponse<RDFinancialReport>> {
    return this.makeRequest(
      `/RDFinancialReport?branchId=${branchId}&fromDate=${fromDate}&toDate=${toDate}&showAllClBal=${showAllClBal}`
    );
  }
}

const rdFinancialReportApi = new RDFinancialReportApiService();
export default rdFinancialReportApi;
