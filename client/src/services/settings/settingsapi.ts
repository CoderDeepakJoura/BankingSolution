import { AuthResponse, ApiService, ApiResponse } from "../api";
import { API_CONFIG } from "../../constants/config";
export interface SettingsDTO {
  generalSettings: GeneralSettingsDTO;
  accountSettings: AccountSettingsDTO;
  voucherSettings: VoucherSettingsDTO;
  tdsSettings: TDSSettingsDTO;
  printingSettings: PrintingSettingsDTO;
}

// ============= General Settings DTO =============
export interface GeneralSettingsDTO {
  BranchId: number;
  AdmissionFeeAccountId: number;
  AdmissionFeeAmount: number;
  DefaultCashAccountId: number;
  MinimumMemberAge: number;
  ShareMoneyPercentageForLoan: number;
  BankFDMaturityReminder: boolean;
  BankFDMaturityReminderDays: number; 
}

// ============= Account Settings DTO =============
export interface AccountSettingsDTO {
  BranchId: number;
  AccountVerification: boolean;
  MemberKYC: boolean;
  SavingAccountLength: number;
  LoanAccountLength: number;
  FDAccountLength: number;
  RDAccountLength: number;
  ShareAccountLength: number;
}

// ============= Voucher Settings DTO =============
export interface VoucherSettingsDTO {
  BranchId: number;
  VoucherPrinting: boolean;
  SingleVoucherEntry: boolean;
  VoucherNumberSetting: number; // 1=Day Wise, 2=Financial Year Wise
  AutoVerification: boolean;
  ReceiptNoSetting: boolean;
}

// ============= TDS Settings DTO =============
export interface TDSSettingsDTO {
  BranchId: number;
  BankFDTDSApplicability: boolean;
  BankFDTDSRate: number;
  BankFDTDSDeductionFrequency: number; // 1=On Maturity, 2=Monthly, 3=Quarterly, 4=Yearly, 5=At Interest Posting
  BankFDTDSLedgerAccountId: number;
}

// ============= Printing Settings DTO =============
export interface PrintingSettingsDTO {
  BranchId: number;
  FDReceiptSetting: boolean;
  RDCertificateSetting: boolean;
}

// ============= Response DTO for Fetch =============
export interface SettingsResponseDTO {
  generalSettings: GeneralSettingsDTO | null;
  accountSettings: AccountSettingsDTO | null;
  voucherSettings: VoucherSettingsDTO | null;
  tdsSettings: TDSSettingsDTO | null;
  printingSettings: PrintingSettingsDTO | null;
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
