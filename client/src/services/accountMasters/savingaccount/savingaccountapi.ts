// services/savingaccount/savingaccountapi.ts
import { ApiService, ApiResponse } from "../../api";
export interface ResponseDto {
  success: boolean;
  message: string;
}

// Maps to AccountMasterDTO in backend
export interface AccountMasterDTO {
  accId?: number;
  branchId: number;
  headId: number;
  headCode: number;
  accTypeId: number;
  accountNumber: string;
  accountName: string;
  accOpeningDate: string;
  isAccClosed: boolean;
  isAccAddedManually?: number; // short = 0
  generalProductId?: number;
  accPrefix?: string;
  accSuffix?: number;
  accountNameSL?: string;
  memberId?: number;
  memberBranchId?: number;
  closingDate?: string;
  closingRemarks?: string;
  isJointAccount?: number; // short = 0
  isSuspenseAccount?: number; // short = 0
  relativeName?: string;
  gender?: number;
  phoneNo1?: string;
  email?: string;
  addressLine?: string;
  dob?: string;
  addedUsing?: string;
  membershipNo?: string;
}

// Maps to JointAccountInfoDTO in backend
export interface JointAccountInfoDTO {
  id?: number;
  branchId: number;
  accountName: string;
  relationWithAccHolder: number;
  dob: string;
  addressLine: string;
  gender: number;
  memberId: number;
  memberBrId: number;
  jointWithAccountId: number;
  jointAccHolderAccountNumber: string;
}

// Maps to JointAccountWithdrawalInfoDTO in backend
export interface JointAccountWithdrawalInfoDTO {
  id?: number;
  branchId: number;
  accountId: number;
  minimumPersonsRequiredForWithdrawal: number;
  jointAccountHolderCompulsoryForWithdrawal: number; // short (0 or 1)
}

// Maps to VoucherDTO in backend
export interface VoucherDTO {
  id?: number;
  brID: number;
  voucherNo?: number;
  voucherType?: number;
  voucherSubType?: number;
  voucherDate: string;
  actualTime?: string;
  voucherNarration?: string;
  voucherStatus?: string;
  addedBy?: number;
  modifiedBy?: number;
  verifiedBy?: number;
  otherBrID?: number;
  totalDebit?: number;
  admissionFeeAmount?: number;
  smAmount?: number;
  admissionFeesAccount?: string;
  admissionFeesAccountId?: number;
  debitAccountName?: string;
  debitAccountId?: number;
  openingAmount?: number;
  openingBalanceType: string;
}

// Maps to AccountNomineeInfoDTO in backend
export interface AccountNomineeInfoDTO {
  id?: number;
  branchId: number;
  accountId: number;
  nomineeName: string;
  nomineeDob: string;
  relationWithAccHolder: number;
  addressLine: string;
  nomineeDate: string;
  isMinor: number; // short (0 or 1)
  nameOfGuardian?: string;
}

// Maps to AccountDocDetailsDTO in backend
export interface AccountDocDetailsDTO {
  id?: number;
  branchId: number;
  accountId: number;
  picExt: string;
  signExt: string;
  pictureUrl?: string;
  signatureUrl?: string;
  pictureBase64?: string;
  signatureBase64?: string;
}

// Maps to CommonAccMasterDTO in backend
export interface CompleteSavingAccountDTO {
  accountMasterDTO: AccountMasterDTO;
  GSTInfoDTO?: any;
  voucher: VoucherDTO;
  accountDocDetailsDTO: AccountDocDetailsDTO;
  accNomineeDTO: AccountNomineeInfoDTO[];
  jointAccountInfoDTO: JointAccountInfoDTO[];
  jointAccountWithdrawalInfoDTO?: JointAccountWithdrawalInfoDTO;
  openingBalance? : number;
  productName? : string;
  openingBalanceType?: string;
}

// For member details response
export interface MemberDetailsDTO {
  memberName: string;
  relativeName: string;
  gender: string;
  addressLine1: string;
  dateOfBirth?: string;
  phoneNo?: string;
  emailId?: string;
  memPicExt?: string;
  memSignExt?: string;
  memberId: number;
  memberBranchId: number;
}

export interface SavingAccountFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface SavingAccountResponse {
  success: boolean;
  accounts: CompleteSavingAccountDTO[];
  totalCount: number;
}

export interface CloseSavingAccDTO{
  BranchId: number;
  CreditAccountId: number;
  DebitAccountId: number;
  IncomeAccountId?: number ;
  VoucherDate: string;
  TotalAmount: number;
  TotalInterestAmount: number;
  Narration?: string;
  ClosingCharges: number;
  SavingProductId: number;
}

class SavingAccountService extends ApiService {
  constructor() {
    super();
  }

  async createSavingAccount(
    dto: CompleteSavingAccountDTO,
    pictureFile?: File,
    signatureFile?: File
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append("AccountData", JSON.stringify(dto));

    if (pictureFile) {
      formData.append("Picture", pictureFile); // Capital P
    }
    if (signatureFile) {
      formData.append("Signature", signatureFile); // Capital S
    }

    return this.makeRequest("/SavingAccountMaster", {
      method: "POST",
      body: formData,
    });
  }

  async updateSavingAccount(
    dto: CompleteSavingAccountDTO,
    pictureFile?: File,
    signatureFile?: File
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append("AccountData", JSON.stringify(dto));

    if (pictureFile) {
      formData.append("Picture", pictureFile);
    }
    if (signatureFile) {
      formData.append("Signature", signatureFile);
    }

    return this.makeRequest(`/SavingAccountMaster`, {
      method: "PUT",
      body: formData,
    });
  }

  async deleteSavingAccount(
    accountId: number,
    branchId: number,
    voucherId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(
      `/SavingAccountMaster/${accountId}/${branchId}/${voucherId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async fetchSavingAccounts(
    filter: SavingAccountFilter,
    branchId: number
  ): Promise<ApiResponse<SavingAccountResponse>> {
    return this.makeRequest<SavingAccountResponse>(
      `/SavingAccountMaster/get_all_saving-accounts/${branchId}`,
      {
        method: "POST",
        body: JSON.stringify(filter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  // Add GET method for loading existing account
  async getSavingAccountById(
    id: number,
    branchId: number
  ): Promise<ApiResponse<CompleteSavingAccountDTO>> {
    return this.makeRequest(`/SavingAccountMaster/${id}/${branchId}`, {
      method: "GET",
    });
  }

  async getMemberByAccountNo(
    branchId: number,
    accountNo: string
  ): Promise<ApiResponse<MemberDetailsDTO>> {
    return this.makeRequest(
      `/fetchdata/member-info-with-accno/${branchId}/${accountNo}`,
      {
        method: "GET",
      }
    );
  }

  async getMemberByMembershipNo(
    branchId: number,
    membershipNo: string,
    memberType: number
  ): Promise<ApiResponse<MemberDetailsDTO>> {
    return this.makeRequest(
      `/fetchdata/member-info-with-membershipno/${branchId}/${membershipNo}/${memberType}`,
      {
        method: "GET",
      }
    );
  }

  async close_Saving_Account(
    CloseSavingAccDTO: CloseSavingAccDTO
  ): Promise<ApiResponse<MemberDetailsDTO>> {
    return this.makeRequest(
      `/SavingAccountMaster/close-saving-account`,
      {
        method: "POST",
        body: JSON.stringify(CloseSavingAccDTO),
        headers: {
          "Content-Type": "application/json",
        }
      }
    );
  }
}

const savingAccountService = new SavingAccountService();
export default savingAccountService;
