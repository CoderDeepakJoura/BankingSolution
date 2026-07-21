import { ApiService } from "../api";

export interface OtherBranchAccount {
  id: number;
  brId: number;
  otherBrId: number;
  accId: number;
  otherBranchCode?: string;
  otherBranchName?: string;
  accountName?: string;
}

export interface OtherBranchAccountDTO {
  id?: number;
  brId: number;
  otherBrId: number;
  accId: number;
}

class OtherBranchAccountApiService extends ApiService {
  constructor() {
    super();
  }

  async getAll(branchId: number) {
    return this.makeRequest(`/OtherBranchAccount/${branchId}`, { method: "GET" });
  }

  async create(dto: OtherBranchAccountDTO) {
    return this.makeRequest("/OtherBranchAccount", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async update(dto: OtherBranchAccountDTO) {
    return this.makeRequest("/OtherBranchAccount", {
      method: "PUT",
      body: JSON.stringify(dto),
    });
  }

  async remove(id: number, branchId: number) {
    return this.makeRequest(`/OtherBranchAccount/${id}/${branchId}`, { method: "DELETE" });
  }
}

export default new OtherBranchAccountApiService();
