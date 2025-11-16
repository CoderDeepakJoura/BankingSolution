import { API_CONFIG } from "../../constants/config";
import { AuthResponse, ApiService, ApiResponse } from "../api";
import Swal from "sweetalert2";
export interface AccountMaster {
  accId: number;
  accountName: string;
}
export interface NomineeDetails {
  nomineeName: string;
}

// Account Information Interface
export interface AccountInformation {
  memberName: string;
  relativeName: string;
  memberShipNo: string;
  accountOpeningDate: string;
  minimumBalanceRequired: number;
  address: string;
  contactNo: string;
  emailId: string;
  aadhaarNo: string;
  panCardNo: string;
  nomineeDetails: NomineeDetails | null;
  memberId: Number;
  memberBrId: Number;
  accountPicExt: string;
  accountSignExt: string;
  balance:string | "0";
}
class commonService extends ApiService {
  constructor() {
    super();
  }
  private workingDate?: string;
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

  setWorkingDate = (workingDate?: string) => {
    this.workingDate = workingDate;
  };
  getTodaysDate = () => {
    // If workingDate is provided, parse and format it

    if (this.workingDate) {
      return this.parseWorkingDate(this.workingDate);
    }

    // Otherwise, return current date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Add this helper function to parse the working date format
  parseWorkingDate = (workingDate: string): string => {
    // Format: "29-September-2025"
    const parts = workingDate.split("-");
    if (parts.length !== 3) return this.getTodaysDate(); // Fallback

    const day = parts[0].padStart(2, "0");
    const monthName = parts[1];
    const year = parts[2];

    // Convert month name to number
    const months: { [key: string]: string } = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const month = months[monthName.toLowerCase()] || "01";

    return `${year}-${month}-${day}`;
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
  async productname_unique(
    branchId: number,
    productName: string,
    productId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/fd-productname-exists/${productName}/${branchId}/${productId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async productcode_unique(
    branchId: number,
    productCode: string,
    productId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/fd-productcode-exists/${productCode}/${branchId}/${productId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async saving_productname_unique(
    branchId: number,
    productName: string,
    productId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/saving-productname-exists/${productName}/${branchId}/${productId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async saving_productcode_unique(
    branchId: number,
    productCode: string,
    productId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/saving-productcode-exists/${productCode}/${branchId}/${productId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  handleDateChange = (
    value: string,
    callback: (value: string) => void,
    fieldName: string
  ) => {
    if (!value) {
      callback("");
      return;
    }

    const selectedDate = new Date(value);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate <= new Date(this.getTodaysDate())) {
      callback(value);
    } else {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date",
        text: "Cannot select a future date. Please select today or an earlier date.",
        timer: 2000,
        showConfirmButton: false,
      });
      callback(this.getTodaysDate());
    }
  };

  getCurrentDate = (): string => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  handleResetNotAllowed = () => {
    Swal.fire({
      icon: "error",
      title: "Not Allowed",
      text: "Reset form is not allowed in modify mode.",
    });
  };

  async fetch_saving_products(branchId: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/saving-products/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async fetch_fd_products(branchId: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/fd-products/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async slabname_exists(
    branchId: number,
    slabName: string,
    slabId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/slabname-exists/${slabName}/${branchId}/${slabId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async getSavingPrefixAndSuffix(
    branchId: number,
    productId: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/savingproduct-prefix-and-suffix/${productId}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  getAccountImageUrl(filename: string, type: string) {
    return `${API_CONFIG.BASE_URL}/SavingAccountMaster/savingaccount-images/${filename}/${type}`;
  }

  async saving_suffix_exists(
    branchId: number,
    productId: number,
    suffix: number,
    accountId: number = 0
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/saving-suffix-exists/${productId}/${branchId}/${accountId}/${suffix}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async fetch_pic_and_sign_extension(
    branchId: number,
    memberId: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/memberpic-and-sign-ext/${branchId}/${memberId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async fetch_branch_sessions(branchId: number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/branch-session-info/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  async fetch_deposit_accounts(branchId: number, productId: Number, accountType: Number, isClosed: boolean = false ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/deposit-accounts-info/${branchId}/${productId}/${accountType}/${isClosed}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  async fetch_deposit_account_info_from_accountId(branchId: number, accountId: Number, accountType: Number, isClosed: boolean = false ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/account-info-for-deposit-accounts/${branchId}/${accountId}/${accountType}/${isClosed}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  async fetch_joint_acc_info(branchId: number, accountId: Number): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/fetchdata/joint-acc-info/${accountId}/${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  
}

export default new commonService();
