// services/accountMasters/rdaccount/rdaccountapi.ts
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
  rdMaturityDate?: string;  // RD maturity date (was fdmaturityDate)
}

// Maps to RDDetailDTO in backend — mirrors rdaccountdetail table columns
export interface RDDetailDTO {
  id?: number;
  brId: number;
  accId?: number;
  rdnumber?: number;
  rddate: string;           // rddate TIMESTAMP(3)
  rdamount: number;         // rdamount NUMERIC(18,2)
  noofmonths: number;       // noofmonths INT
  rdslabid: number;         // rdslabid INT
  interestrate: number;     // interestrate DOUBLE PRECISION
  maturitydate: string;     // maturitydate TIMESTAMP(3)
  kistamt: number;          // kistamt NUMERIC(18,2)
  kistinterval: number;     // kistinterval INT
  firstkistdate: string;    // firstkistdate TIMESTAMP(3)
  penaltyamt: number;       // penaltyamt NUMERIC(18,2)
  status?: number;          // status INT
  maturityamt: number;      // maturityamt NUMERIC(18,0)
  compoundingInterval: string; // compoundingInterval VARCHAR(20)
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

// Maps to RDVoucherDetailDTO — mirrors voucherrddetail table columns
export interface RDVoucherDetailDTO {
  id?: number;
  brId: number;
  vacccrdrid: number;       // vacccrdrid INT
  rdaccid: number;          // rdaccid INT
  rdaccdetid: number;       // rdaccdetid INT
  amountcr: number;         // amountcr DOUBLE PRECISION
  amountdr: number;         // amountdr DOUBLE PRECISION
  operation: string;        // operation VARCHAR(5)
  valuedate?: string;       // valuedate TIMESTAMP(3)
  voucherdate?: string;     // voucherdate TIMESTAMP(3)
  othrefaccid?: number;     // othrefaccid INT
  penalamt?: number;        // penalamt NUMERIC(24,2)
  penalaccid?: number;      // penalaccid INT
  intdr?: number;           // intdr DOUBLE PRECISION
  intcr?: number;           // intcr DOUBLE PRECISION
  vouchermainstatus?: string; // vouchermainstatus VARCHAR(2)
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

// Maps to CommonRDAccMasterDTO in backend
export interface CommonAccMasterDTO {
  accountMasterDTO: AccountMasterDTO;
  rdAccountDetailDTO?: RDDetailDTO;
  voucher?: VoucherDTO;
  rdVoucherDetailDTO?: RDVoucherDetailDTO;
  accNomineeDTO: AccountNomineeInfoDTO[];
  jointAccountInfoDTO?: Array<{
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
  }>;
  jointAccountWithdrawalInfoDTO?: {
    id?: number;
    branchId: number;
    accountId: number;
    minimumPersonsRequiredForWithdrawal: number;
    jointAccountHolderCompulsoryForWithdrawal: number;
  };
  accountDocDetailsDTO?: AccountDocDetailsDTO;
  creditAccountDetails?: {
    generalAccountId?: number;
    savingAccountId?: number;
    loanAccountId?: number;
    cashAccountId?: number;
    generalAmount?: number;
    savingAmount?: number;
    loanAmount?: number;
    cashAmount?: number;
  };
  matureOrRenewRDInfo?: {
    productId?: number;
    detailId?: number;
    rdAccountId?: number;
    branchId?: number;
    voucherDate?: string;
    narration?: string;
  };
  openingBalance?: string;
  productName?: string;
  openingBalanceType?: string;
  isOpeningEntry?: boolean;
  savingAccountName?: string;
  preMaturityAmount?: number;
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

export interface RDAccountFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface RDAccountResponse {
  success: boolean;
  accounts: CommonRDAccMasterDTO[];
  totalCount: number;
}

// DTO for mature RD operation — maps to voucherrddetail + rdaccountdetail
export interface MatureRDDto {
  MatureRDInfo: {
    rdAccountId: number;
    VoucherDate: string;
    branchId: number;
    postMaturityAmount: string;
    intPayableAmount: string;
    DetailId: number;
    ProductId: number;
    Narration: string;
    PenalAmount: number;      // maps to voucherrddetail.penalamt
    PenalAccountId: number;   // maps to voucherrddetail.penalaccid
    IntDr: number;            // maps to voucherrddetail.intdr
    IntCr: number;            // maps to voucherrddetail.intcr
    Operation: "MT";          // maps to voucherrddetail.operation — MT = Mature
  };
  CreditAccountDetails: {
    generalAccountId: number;
    generalAmount: number;
    savingAccountId: number;
    savingAmount: number;
    loanAccountId: number;
    loanAmount: number;
    loanProduct: string;
    intPostingAmt: number;
    closingCharges: number;
    tdsAmount: number;
    penalAmount: number;
    penalAccountId: number;
    intDr: number;
    intCr: number;
    narration: string;
  };
}

// DTO for premature RD closure
export interface PreMatureRDDto {
  BranchId: number;
  RDAccountId: number;
  CreditAccountId: number;
  DebitAccountId: number;
  IncomeAccountId?: number;
  VoucherDate: string;
  TotalAmount: number;
  TotalInterestAmount: number;
  Narration?: string;
  ClosingCharges: number;
  RDProductId: number;
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

class RDAccountService extends ApiService {
  constructor() {
    super();
  }

  async createRDAccount(
    dto: CommonRDAccMasterDTO,
  ): Promise<ApiResponse<any>> {
    return this.makeRequest("/RDAccountMaster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
  }

  async updateRDAccount(
    dto: CommonRDAccMasterDTO,
  ): Promise<ApiResponse<any>> {
    return this.makeRequest("/RDAccountMaster", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
  }

  async deleteRDAccount(
    accountId: number,
    branchId: number,
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(
      `/RDAccountMaster/${accountId}/${branchId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  async fetchRDAccounts(
    filter: RDAccountFilter,
    branchId: number,
  ): Promise<ApiResponse<RDAccountResponse>> {
    return this.makeRequest<RDAccountResponse>(
      `/RDAccountMaster/get_all_rd-accounts/${branchId}`,
      {
        method: "POST",
        body: JSON.stringify(filter),
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  async getRDAccountById(
    id: number,
    branchId: number,
    currentDate?: string,
  ): Promise<ApiResponse<CommonAccMasterDTO>> {
    const url = currentDate
      ? `/RDAccountMaster/${id}/${branchId}/${currentDate}`
      : `/RDAccountMaster/${id}/${branchId}`;
    return this.makeRequest(url, { method: "GET" });
  }

  async getMemberByAccountNo(
    branchId: number,
    accountNo: string,
  ): Promise<ApiResponse<MemberDetailsDTO>> {
    return this.makeRequest(
      `/fetchdata/member-info-with-accno/${branchId}/${accountNo}`,
      { method: "GET" },
    );
  }

  async getMemberByMembershipNo(
    branchId: number,
    membershipNo: string,
    memberType: number,
  ): Promise<ApiResponse<MemberDetailsDTO>> {
    return this.makeRequest(
      `/fetchdata/member-info-with-membershipno/${branchId}/${membershipNo}/${memberType}`,
      { method: "GET" },
    );
  }

  // Get interest rate from slab based on tenure
  async getInterestSlab(
    branchId: number,
    productId: number,
    months: number,
    days: number,
  ): Promise<ApiResponse<InterestSlabDTO>> {
    const totalDays = months * 30 + days;
    return this.makeRequest(
      `/RDAccountMaster/interest-slab/${branchId}/${productId}/${totalDays}`,
      { method: "GET" },
    );
  }

  // Mature RD — maps to voucherrddetail.operation = "MT"
  async matureRD(
    dto: MatureRDDto | any,
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest(
      `/RDAccountMaster/mature-rd`,
      {
        method: "POST",
        body: JSON.stringify(dto),
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Premature RD closure
  async preMatureRD(
    dto: PreMatureRDDto | any,
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest(
      `/RDAccountMaster/premature-rd`,
      {
        method: "POST",
        body: JSON.stringify(dto),
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Calculate maturity amount for RD
  async calculateMaturityAmount(
    principal: number,
    kistAmount: number,
    interestRate: number,
    months: number,
    days: number,
    kistInterval: number,
  ): Promise<ApiResponse<{ maturityAmount: number; maturityDate: string }>> {
    return this.makeRequest(`/RDAccountMaster/calculate-maturity`, {
      method: "POST",
      body: JSON.stringify({
        principal,
        kistAmount,
        interestRate,
        months,
        days,
        kistInterval,
      }),
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if RD account number exists
  async checkRDAccountExists(
    branchId: number,
    productId: number,
    rdAccountNo: string,
    excludeAccountId?: number,
  ): Promise<ApiResponse<boolean>> {
    return this.makeRequest(
      `/RDAccountMaster/check-rd-exists/${branchId}/${productId}/${rdAccountNo}${
        excludeAccountId ? `/${excludeAccountId}` : ""
      }`,
      { method: "GET" },
    );
  }
}

const rdAccountService = new RDAccountService();
export default rdAccountService;
