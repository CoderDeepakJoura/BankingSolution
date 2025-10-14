// services/member/memberApi.ts
import { AuthResponse, ApiService, ApiResponse } from "../api";
import { API_CONFIG } from "../../constants/config";

// Response interfaces
export interface ResponseDto {
  success: boolean;
  message: string;
}

// Member Filter for search/pagination
export interface MemberFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

// Main Member DTO (exactly matching your C# MemberDTO)
export interface MemberDTO {
  // Primary keys
  id?: number; // Nullable for new records
  branchId: number;

  // Core Member Details
  defAreaBrId: number;
  memberType?: number;
  nominalMembershipNo?: string;
  permanentMembershipNo?: string;

  // Name Details
  memberName: string;
  memberNameSL?: string;

  // Relationship Details
  relativeName: string;
  relativeNameSL?: string;
  relationId: number;

  // Personal Details
  gender: number;
  dob: string; // ISO date string

  // Categorization
  casteId: number;
  categoryId: number;
  occupationId: number;

  // Dates
  joiningDate: string; // ISO date string

  // Contact Details
  phonePrefix1: string;
  phoneType1: number;
  phoneNo1: string;
  phonePrefix2?: string;
  phoneType2?: number;
  phoneNo2?: string;
  email1: string | "";
  email2: string | "";
}

// Nominee DTO (exactly matching your C# MemberNomineeDetailsDTO)
export interface MemberNomineeDetailsDTO {
  id?: number;
  branchId: number;
  memberId?: number; // Will be set by backend

  // Nominee Personal Details
  nomineeName: string;
  nomRelativeName?: string;
  relationId: number;
  relationWithMember: number;
  age: number;
  dob: string; // ISO date string

  isMinor?: number; // 0 or 1 (SMALLINT)
  nameOfGuardian?: string;
  nameOfGuardianSL?: string;
  nominationDate?: string; // ISO date string

  // Document Details
  aadhaarCardNo: string;
  panCardNo?: string;

  // Share Details
  percentageShare: number;
}

// Document Details DTO (exactly matching your C# MemberDocDetailsDTO)
export interface MemberDocDetailsDTO {
  id?: number;
  branchId: number;
  memberId?: number; // Will be set by backend

  // Document Details
  panCardNo: string;
  aadhaarCardNo: string;
  memberPicExt: string; // File extension like "jpg", "png"
  memberSignExt: string; // File extension like "jpg", "png"
}

// Location Details DTO (exactly matching your C# MemberLocationDetailsDTO)
export interface MemberLocationDetailsDTO {
  id?: number;
  branchId: number;
  memberId?: number; // Will be set by backend

  // Address Lines
  addressLine1: string;
  addressLineSL1?: string;
  addressLine2?: string;
  addressLineSL2?: string;

  // Location IDs
  villageId1: number;
  villageId2?: number;
  po1: number;
  po2?: number;
  tehsil1: number;
  tehsil2?: number;
  thanaId1: number;
  thanaId2?: number;
  zoneId1: number;
  zoneId2?: number;
}

// Account Master DTO (stub - add fields as needed)
export interface AccountMasterDTO {
  // Add fields as per your AccountMasterDTO
  [key: string]: any;
}

// Voucher DTO (matching your C# VoucherDTO)
export interface VoucherDTO {
  voucherNarration?: string;
  // Add other voucher fields as needed based on your requirements
  smAmount?: number;
  admissionFeesAccount?: string;
  admissionFeesAccountId?: number;
  admissionFeeAmount?: string;
  debitAccountId?: number;
  debitAccountName?: string;
  totalDebit?: number;
  openingAmount? : number;
}

// Combined Member DTO (exactly matching your C# CombinedMemberDTO)
export interface CombinedMemberDTO {
  member: MemberDTO;
  nominees: MemberNomineeDetailsDTO[];
  documentDetails: MemberDocDetailsDTO;
  locationDetails: MemberLocationDetailsDTO;
  accMaster: AccountMasterDTO | null;
  voucher: VoucherDTO;
  voucherId?: Number | 0;
}

// Member Response for list operations
export interface MemberResponse {
  success: boolean;
  members: CombinedMemberDTO[];
  totalCount: number;
}

class MemberApiService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Create a new member
   */
  async createMember(
    combinedMemberDTO: CombinedMemberDTO,
    memberPhoto?: File, // ✅ Add file parameters
    memberSignature?: File
  ): Promise<ApiResponse<ResponseDto>> {
    const formData = new FormData();

  formData.append('memberData', JSON.stringify(combinedMemberDTO));

  if (memberPhoto) {
    formData.append('memberPhoto', memberPhoto);
  }
  
  if (memberSignature) {
    formData.append('memberSignature', memberSignature);
  }
    return this.makeRequest<ResponseDto>("/member", {
      method: "POST",
      body: formData,
      // Don't set Content-Type for FormData, let browser set it with boundary
    });
  }

  async updateMember(
    combinedMemberDTO: CombinedMemberDTO,
    memberPhoto?: File,
    memberSignature?: File
  ): Promise<ApiResponse<ResponseDto>> {
    const formData = new FormData();
    formData.append("memberData", JSON.stringify(combinedMemberDTO));

    if (memberPhoto) {
      formData.append("memberPhoto", memberPhoto);
    }
    if (memberSignature) {
      formData.append("memberSignature", memberSignature);
    }

    return this.makeRequest<ResponseDto>("/member", {
      method: "PUT",
      body: formData,
    });
  }

  /**
   * Delete a member
   */
  async deleteMember(
    memberId: number,
    branchId: number,
    voucherId: number
  ): Promise<ApiResponse<ResponseDto>> {
    return this.makeRequest<ResponseDto>(`/member/${memberId}/${branchId}/${voucherId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get all members with filtering
   */
  async fetchMembers(
    filter: MemberFilter,
    branchId: number
  ): Promise<ApiResponse<MemberResponse>> {
    return this.makeRequest<MemberResponse>(
      `/member/get_all_members/${branchId}`,
      {
        method: "POST",
        body: JSON.stringify(filter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Get member by ID
   */
  async getMemberById(
    memberId: number,
    branchId: number
  ): Promise<ApiResponse<CombinedMemberDTO>> {
    return this.makeRequest<CombinedMemberDTO>(
      `/member/get-member-info/${memberId}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// ✅ Export singleton instance for reuse
export default new MemberApiService();
