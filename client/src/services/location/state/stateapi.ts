import { AuthResponse, ApiService, ApiResponse } from "../../api";
import { API_CONFIG } from "../../../constants/config";

export interface StateFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

export interface State {
  stateId: number;
  stateCode: string;
  stateName: string;
  
}

export interface StateResponse {
  success: boolean;
  states: State[];
  totalCount: number;
}

export interface CreateStateRequest {
  stateName: string;
  stateCode: string;
}

export interface UpdateStateRequest {
  stateName: string;
  stateCode: string;
}

class StateApiService extends ApiService {
  constructor() {
    super();
  }

  // ========== NEW RESTFUL ENDPOINTS ==========

  /**
   * Create new state - POST /api/state
   */
  async createState(
    stateName: string,
    stateCode: string
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>("/state", {
      method: "POST",
      body: JSON.stringify({ 
        stateName, 
        stateCode 
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get all states with query parameters - GET /api/state?searchTerm=term&pageNumber=1&pageSize=10
   */
  async getStates(
    searchTerm?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Promise<ApiResponse<StateResponse>> {
    const params = new URLSearchParams();
    
    if (searchTerm) {
      params.append('searchTerm', searchTerm);
    }
    params.append('pageNumber', pageNumber.toString());
    params.append('pageSize', pageSize.toString());

    return this.makeRequest<StateResponse>(
      `/state?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /**
   * Update state - PUT /api/state/{id}
   */
  async updateState(
    stateId: number,
    stateName: string,
    stateCode: string
  ): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>(`/state/${stateId}`, {
      method: "PUT",
      body: JSON.stringify({
        stateName,
        stateCode
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Delete state - DELETE /api/state/{id}
   */
  async deleteState(stateId: number): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>(`/state/${stateId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export default new StateApiService();