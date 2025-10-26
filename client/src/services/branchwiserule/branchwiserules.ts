import { API_CONFIG } from '../../constants/config';
import { AuthResponse, ApiService, ApiResponse } from "../api";

export interface SavingProductBranchwiseRuleDTO {
  Id?: number;
  BranchId: number;
  SavingProductId: number;
  IntExpAccount: number;
  DepWithdrawLimitInterval?: number;
  DepWithdrawLimit?: number;
}

export interface FDProductBranchwiseRuleDTO {
  Id?: number;
  BranchId: number;
  FDProductId: number;
  InterestCalculationMethod: number;
  DaysInAYear: number;
  AccNoGeneration: number;
  IntExpenseAccount: number;
  ClosingChargesAccount: number;
  IntPayableAccount: number;
}
class branchWiseRuleService extends ApiService {
  constructor() {
    super();
  }
  async get_saving_branchwiserule_data(
    productId: number,
    branchid: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/SavingProductBranchwiseRule/${branchid}/${productId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async insert_saving_product_branchwise_rule(
    dto: SavingProductBranchwiseRuleDTO
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/SavingProductBranchwiseRule`,
      {
        method: "POST",
        body: JSON.stringify(dto),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async get_fd_branchwiserule_data(
    productId: number,
    branchid: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/FDProductBranchwiseRule/${branchid}/${productId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  async insert_fd_product_branchwise_rule(
    dto: FDProductBranchwiseRuleDTO
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<AuthResponse>(
      `/FDProductBranchwiseRule`,
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
export default new branchWiseRuleService();