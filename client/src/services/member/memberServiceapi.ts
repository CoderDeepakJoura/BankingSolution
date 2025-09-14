// services/api/memberService.ts
interface ResponseDto {
  success: boolean;
  message: string;
}

interface CombinedMemberDTO {
  // Basic Info
  branchId: number;
  defAreaBrId?: number;
  memberType?: string;
  nominalMembershipNo?: string;
  permanentMembershipNo?: string;
  firstName: string;
  lastName: string;
  firstNameSL?: string;
  lastNameSL?: string;
  relFirstName: string;
  relLastName?: string;
  relationId?: number;
  gender: string;
  dob: string;
  casteId?: number;
  joiningDate: string;
  occupationId?: number;
  
  // Address
  thana?: string;
  addressLine1: string;
  addressLineSL1?: string;
  villageId1: number;
  po1?: string;
  tehsil1?: string;
  addressLine2?: string;
  addressLineSL2?: string;
  villageId2?: number;
  po2?: string;
  tehsil2?: string;
  
  // Contact
  phoneType1?: string;
  phonePrefix1?: string;
  phoneNo1?: string;
  phoneType2?: string;
  phonePrefix2?: string;
  phoneNo2?: string;
  
  // Documents
  panCardNo?: string;
  aadhaarCardNo?: string;
  gstiNo?: string;
  status?: string;
  statusDate?: string;
  zoneId?: number;
  categoryId?: number;
  
  // Nominees
  nominees: NomineeDTO[];
}

interface NomineeDTO {
  id?: number;
  firstName: string;
  lastName?: string;
  firstNameSL?: string;
  lastNameSL?: string;
  relation?: string;
  age?: number;
  isMinor: boolean;
  dob?: string;
  nameOfGuardian?: string;
  nameOfGuardianSL?: string;
  nominationDate?: string;
  aadhaarCardNo?: string;
}

class MemberService {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.REACT_APP_API_BASE_URL || 'https://localhost:7000/api') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if you have authentication
        // 'Authorization': `Bearer ${getAuthToken()}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}${url}`, config);

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Transform form data to DTO format
  private transformToDTO(memberData: any, nominees: any[]): CombinedMemberDTO {
    return {
      // Basic Info
      branchId: parseInt(memberData.branchId) || 0,
      defAreaBrId: memberData.defAreaBrId ? parseInt(memberData.defAreaBrId) : undefined,
      memberType: memberData.memberType || undefined,
      nominalMembershipNo: memberData.nominalMembershipNo || undefined,
      permanentMembershipNo: memberData.permanentMembershipNo || undefined,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      firstNameSL: memberData.firstNameSL || undefined,
      lastNameSL: memberData.lastNameSL || undefined,
      relFirstName: memberData.relFirstName,
      relLastName: memberData.relLastName || undefined,
      relationId: memberData.relationId ? parseInt(memberData.relationId) : undefined,
      gender: memberData.gender,
      dob: memberData.dob,
      casteId: memberData.casteId ? parseInt(memberData.casteId) : undefined,
      joiningDate: memberData.joiningDate,
      occupationId: memberData.occupationId ? parseInt(memberData.occupationId) : undefined,

      // Address
      thana: memberData.thana || undefined,
      addressLine1: memberData.addressLine1,
      addressLineSL1: memberData.addressLineSL1 || undefined,
      villageId1: parseInt(memberData.villageId1) || 0,
      po1: memberData.po1 || undefined,
      tehsil1: memberData.tehsil1 || undefined,
      addressLine2: memberData.addressLine2 || undefined,
      addressLineSL2: memberData.addressLineSL2 || undefined,
      villageId2: memberData.villageId2 ? parseInt(memberData.villageId2) : undefined,
      po2: memberData.po2 || undefined,
      tehsil2: memberData.tehsil2 || undefined,

      // Contact
      phoneType1: memberData.phoneType1 || undefined,
      phonePrefix1: memberData.phonePrefix1 || undefined,
      phoneNo1: memberData.phoneNo1 || undefined,
      phoneType2: memberData.phoneType2 || undefined,
      phonePrefix2: memberData.phonePrefix2 || undefined,
      phoneNo2: memberData.phoneNo2 || undefined,

      // Documents
      panCardNo: memberData.panCardNo || undefined,
      aadhaarCardNo: memberData.aadhaarCardNo || undefined,
      gstiNo: memberData.gstiNo || undefined,
      status: memberData.status || undefined,
      statusDate: memberData.statusDate || undefined,
      zoneId: memberData.zoneId ? parseInt(memberData.zoneId) : undefined,
      categoryId: memberData.categoryId ? parseInt(memberData.categoryId) : undefined,

      // Nominees
      nominees: nominees.map(nominee => ({
        id: nominee.id,
        firstName: nominee.firstName,
        lastName: nominee.lastName || undefined,
        firstNameSL: nominee.firstNameSL || undefined,
        lastNameSL: nominee.lastNameSL || undefined,
        relation: nominee.relation || undefined,
        age: nominee.age ? parseInt(nominee.age) : undefined,
        isMinor: nominee.isMinor,
        dob: nominee.dob || undefined,
        nameOfGuardian: nominee.nameOfGuardian || undefined,
        nameOfGuardianSL: nominee.nameOfGuardianSL || undefined,
        nominationDate: nominee.nominationDate || undefined,
        aadhaarCardNo: nominee.aadhaarCardNo || undefined,
      }))
    };
  }

  async createMember(memberData: any, nominees: any[]): Promise<ResponseDto> {
    const dto = this.transformToDTO(memberData, nominees);
    return this.makeRequest<ResponseDto>('/members', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getAllMembers(): Promise<CombinedMemberDTO[]> {
    return this.makeRequest<CombinedMemberDTO[]>('/members');
  }

  async getMemberById(id: number, branchId: number): Promise<CombinedMemberDTO> {
    return this.makeRequest<CombinedMemberDTO>(`/members/${id}/${branchId}`);
  }

  async updateMember(memberData: any, nominees: any[]): Promise<ResponseDto> {
    const dto = this.transformToDTO(memberData, nominees);
    return this.makeRequest<ResponseDto>('/members', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async deleteMember(id: number, branchId: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/members/${id}/${branchId}`, {
      method: 'DELETE',
    });
  }
}

// Create singleton instance
export const memberService = new MemberService();
export default memberService;
