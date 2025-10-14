import { API_CONFIG } from '../../constants/config';
import { AuthResponse, ApiService, ApiResponse } from "../api";
export interface AccountMaster {
  accId: number;
  accountName: string;
}
class commonService extends ApiService {
  constructor() {
    super();
  }
  async get_states(): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>("/fetchdata/states", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  }

  async fetchCategory(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/category-info/${branchid}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  getLastSegment = (inputString: string) => {
    if (typeof inputString !== "string" || inputString.length === 0) {
      return null;
    }
    const segments = inputString.split("-");
    return Number(segments.at(-1));
  };

  getFileExtension = (file: File | null): string => {
    if (!file) return "";
    const fileName = file.name;
    return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
  };

  async caste_Info(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(`/fetchdata/caste-info/${branchid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async category_Info_from_caste(
    casteId: number,
    branchid: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/category-info-from-caste/${casteId}/${branchid}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async location_Info(
    villageId: number,
    branchid: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/location-data/${villageId}/${branchid}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  async relation_info(): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(`/fetchdata/relations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  async village_info(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/village-info/${branchid}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  async occupation_Info(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/occupations/${branchid}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  async general_accmasters_info(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/general-accounts/${branchid}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async settings(branchid: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(`/fetchdata/settings/${branchid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async accno_unique(
    branchid: number,
    accountNumber: string,
    accId: number = 0,
    accTypeId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/account-number-exists/${accountNumber}/${branchid}/${accId}/${accTypeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async nominalmembershipNo_unique(
    branchid: number,
    nominal_membershipno: string,
    memberId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/nominal-membershipno-exists/${nominal_membershipno}/${branchid}/${memberId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async permanentmembershipNo_unique(
    branchid: number,
    permanent_membershipno: string,
    memberId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/permanent-membershipno-exists/${permanent_membershipno}/${branchid}/${memberId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async aadhaar_unique(
    branchid: number,
    aadhaarCardNo: string,
    memberId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/aadhaar-exists/${aadhaarCardNo}/${branchid}/${memberId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async PAN_unique(
    branchid: number,
    panCardNo: string,
    memberId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/PAN-exists/${panCardNo}/${branchid}/${memberId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  getTodaysDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  splitDate = (dateString: string) => {
    if (!dateString) return "";
    const utcDateString = dateString.endsWith("Z")
      ? dateString
      : `${dateString}Z`;
    const date = new Date(utcDateString);
    return date.toISOString().split("T")[0];
  };

  getImageUrl(filename: string, type: string) {
  return `${API_CONFIG.BASE_URL}/member/member-images/${filename}/${type}`;
}

}

export default new commonService();
