// services/accountMasters/fdaccount/fdaccountapi.ts
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
  isAccAddedManually?: number;
  generalProductId?: number;
  accPrefix?: string;
  accSuffix?: number;
  accountNameSL?: string;
  memberId?: number;
  memberBranchId?: number;
  closingDate?: string;
  closingRemarks?: string;
  isJointAccount?: number;
  isSuspenseAccount?: number;
  relativeName?: string;
  gender?: number;
  phoneNo1?: string;
  email?: string;
  addressLine?: string;
  dob?: string;
  addedUsing?: string;
  membershipNo?: string;
  ltdNo?: string;
  fdmaturityDate?: string;
}

// Maps to FDDetailDTO in backend
export interface FDDetailDTO {
  id?: number;
  branchId: number;
  accountId?: number;
  fdAccountNo?: string;
  fdDate: string;
  receiptNo?: string;
  fdAmount: number;
  fdPeriodMonths: number;
  fdPeriodDays: number;
  intRate: number;
  fdstatus: number;
  compoundingInterval: string;
  fdmaturityDate: string;
  maturityAmount: number;
  slabId: number;
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
  debitAccountName?: string;
  debitAccountId?: number;
  openingAmount?: number;
  openingBalanceType: string;
}

// Maps to FDVoucherDetailDTO - for FD specific voucher details
export interface FDVoucherDetailDTO {
  id?: number;
  branchId: number;
  voucherId?: number;
  paymentMode: "byCashGL" | "bySaving" | "both";
  // Cash/GL fields
  cashGLAccountId?: number;
  cashGLAccountName?: string;
  cashGLAmount?: number;
  // Saving fields
  savingProductId?: number;
  savingProductName?: string;
  savingAccountId?: number;
  savingAmount?: number;
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
  isMinor: number;
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
export interface CommonAccMasterDTO {
  accountMasterDTO: AccountMasterDTO;
  fdAccountDetailDTO: FDDetailDTO[];
  voucher?: VoucherDTO;
  fdVoucherDetailDTO?: FDVoucherDetailDTO;
  accNomineeDTO: AccountNomineeInfoDTO[];
  openingBalance?: number;
  productName?: string;
  openingBalanceType?: string;
  isOpeningEntry?: boolean;
  savingAccountName?: string;
  preMaturityAmount?: number;
  fdAccountDetailDTOSingle: FDDetailDTO;
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

export interface FDAccountFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface FDAccountResponse {
  success: boolean;
  accounts: CommonAccMasterDTO[];
  totalCount: number;
}

export interface CloseFDAccDTO {
  BranchId: number;
  FDAccountId: number;
  CreditAccountId: number;
  DebitAccountId: number;
  IncomeAccountId?: number;
  VoucherDate: string;
  TotalAmount: number;
  TotalInterestAmount: number;
  Narration?: string;
  ClosingCharges: number;
  FDProductId: number;
  IsPrematureClosure: boolean;
  PrematureClosingAmount?: number;
}

// Interest Slab DTO
export interface InterestSlabDTO {
  id?: number;
  productId: number;
  minDays: number;
  maxDays: number;
  interestRate: number;
  compoundingInterval: string;
}

class FDAccountService extends ApiService {
  constructor() {
    super();
  }

  async createFDAccount(
    dto: CommonAccMasterDTO,
  ): Promise<ApiResponse<any>> {

    return this.makeRequest("/FDAccountMaster", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
  }

  async updateFDAccount(
    dto: CommonAccMasterDTO
  ): Promise<ApiResponse<any>> {
    return this.makeRequest("/FDAccountMaster", {
      method: "PUT",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
  }

  async deleteFDAccount(
    accountId: number,
    branchId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(
      `/FDAccountMaster/${accountId}/${branchId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async fetchFDAccounts(
    filter: FDAccountFilter,
    branchId: number
  ): Promise<ApiResponse<FDAccountResponse>> {
    return this.makeRequest<FDAccountResponse>(
      `/FDAccountMaster/get_all_fd-accounts/${branchId}`,
      {
        method: "POST",
        body: JSON.stringify(filter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async getFDAccountById(
    id: number,
    branchId: number,
    currentDate?: string
  ): Promise<ApiResponse<CommonAccMasterDTO>> {
    const url = currentDate
      ? `/FDAccountMaster/${id}/${branchId}/${currentDate}`
      : `/FDAccountMaster/${id}/${branchId}`;
    return this.makeRequest(url, {
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

  async closeFDAccount(
    closeFDAccDTO: CloseFDAccDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest(`/FDAccountMaster/close-fd-account`, {
      method: "POST",
      body: JSON.stringify(closeFDAccDTO),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Get interest rate from slab based on tenure
  async getInterestSlab(
    branchId: number,
    productId: number,
    months: number,
    days: number
  ): Promise<ApiResponse<InterestSlabDTO>> {
    const totalDays = months * 30 + days;
    return this.makeRequest(
      `/FDAccountMaster/interest-slab/${branchId}/${productId}/${totalDays}`,
      {
        method: "GET",
      }
    );
  }

  // Premature FD closure
  async prematureCloseFD(
    closeFDAccDTO: CloseFDAccDTO
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest(`/FDAccountMaster/premature-close-fd`, {
      method: "POST",
      body: JSON.stringify(closeFDAccDTO),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Calculate maturity amount
  async calculateMaturityAmount(
    principal: number,
    interestRate: number,
    months: number,
    days: number,
    compoundingInterval: string
  ): Promise<ApiResponse<{ maturityAmount: number; maturityDate: string }>> {
    return this.makeRequest(`/FDAccountMaster/calculate-maturity`, {
      method: "POST",
      body: JSON.stringify({
        principal,
        interestRate,
        months,
        days,
        compoundingInterval,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Check if FD account number exists
  async checkFDAccountExists(
    branchId: number,
    productId: number,
    fdAccountNo: string,
    excludeAccountId?: number
  ): Promise<ApiResponse<boolean>> {
    return this.makeRequest(
      `/FDAccountMaster/check-fd-exists/${branchId}/${productId}/${fdAccountNo}${
        excludeAccountId ? `/${excludeAccountId}` : ""
      }`,
      {
        method: "GET",
      }
    );
  }
  async matureFD(
   dto: any
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest(
      `/FDAccountMaster/mature-or-renew-fd`,
      {
        method: "POST",
        body: JSON.stringify(dto),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  async preMatureFD(
   dto: any
  ): Promise<ApiResponse<ResponseDto>> {
    alert(JSON.stringify(dto));
    return this.makeRequest(
      `/FDAccountMaster/premature-fd`,
      {
        method: "POST",
        body: JSON.stringify(dto),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

const fdAccountService = new FDAccountService();
export default fdAccountService;
