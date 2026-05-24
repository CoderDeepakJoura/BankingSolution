import { ApiService, ApiResponse } from "../api";

export interface ExpenseCategoryDTO {
  id?: number;
  branchId: number;
  code?: string;
  description?: string;
  descriptionSL?: string;
}

export interface ExpenseCategoryFilter {
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

class ExpenseCategoryApiService extends ApiService {
  async create(dto: ExpenseCategoryDTO): Promise<ApiResponse> {
    return this.makeRequest("/ExpenseCategory", { method: "POST", body: JSON.stringify(dto) });
  }

  async update(dto: ExpenseCategoryDTO, id: number): Promise<ApiResponse> {
    return this.makeRequest(`/ExpenseCategory/${id}`, { method: "PUT", body: JSON.stringify(dto) });
  }

  async remove(id: number, branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/ExpenseCategory/${branchId}/${id}`, { method: "DELETE" });
  }

  async getById(id: number, branchId: number): Promise<ApiResponse<{ data: ExpenseCategoryDTO }>> {
    return this.makeRequest(`/ExpenseCategory/${id}/${branchId}`);
  }

  async getAll(branchId: number, filter: ExpenseCategoryFilter): Promise<ApiResponse> {
    return this.makeRequest(`/ExpenseCategory/get-all/${branchId}`, { method: "POST", body: JSON.stringify(filter) });
  }

  async getList(branchId: number): Promise<ApiResponse> {
    return this.makeRequest(`/ExpenseCategory/list/${branchId}`);
  }
}

export default new ExpenseCategoryApiService();
