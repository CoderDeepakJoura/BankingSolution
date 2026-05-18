import { ApiService } from '../api';

export interface UserDTO {
  id?: number;
  branchId: number;
  username: string;
  password?: string;
  isAuthorized: number;
  isSu: number;
  isBranchSu: number;
  userType: number;
}

export interface UserListDTO {
  id: number;
  branchId: number;
  username: string;
  isAuthorized: number;
  isSu: number;
  isBranchSu: number;
  userType: number;
}

export interface UserFilterDTO {
  branchId: number;
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
}

class UserApiService extends ApiService {
  constructor() { super(); }

  async createUser(dto: UserDTO): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/User/create_user', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getAllUsers(filter: UserFilterDTO): Promise<{ success: boolean; data: UserListDTO[]; totalCount: number; message: string }> {
    const res: any = await this.makeRequest('/User/get_all_users', {
      method: 'POST',
      body: JSON.stringify(filter),
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      success: res.success ?? false,
      data: res.users ?? [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? '',
    };
  }

  async modifyUser(dto: UserDTO): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/User/modify_user', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async deleteUser(id: number, branchId: number): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/User/delete_user', {
      method: 'POST',
      body: JSON.stringify({ id, branchId }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async unauthorizeUser(id: number, branchId: number): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/User/unauthorize_user', {
      method: 'POST',
      body: JSON.stringify({ id, branchId }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async authorizeUser(id: number, branchId: number): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/User/authorize_user', {
      method: 'POST',
      body: JSON.stringify({ id, branchId }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const userApi = new UserApiService();
