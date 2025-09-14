import { API_CONFIG } from '../constants/config';

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
}

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export interface LoginCredentials {
  username: string;
  password: string;
  branchcode: string;
}

export interface AuthResponse {
  token?: string;
  user?: {
    id: string;
    username: string;
    email?: string;
  };
}

export class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  async makeRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    };

    try {
      const response = await fetch(url, config);
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Request failed';

        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            const fallback = await response.text();
            errorMessage = fallback || errorMessage;
          }
        } else {
          errorMessage = await response.text() || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {};
      }

      const contentType = response.headers.get('content-type');
      const text = await response.text();

      if (contentType && contentType.includes('application/json') && text) {
        return {
          ...(JSON.parse(text) as ApiResponse<T>)
        };
      }

      return { data: text as any };

    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(username: string, password: string, branchcode: string): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, branchcode })
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.makeRequest('/auth/logout', {
      method: 'POST'
    });
  }

   async validate_token(): Promise<ApiResponse> {
    return this.makeRequest('/auth/validate_token', {
      method: 'GET'
    });
  }
  async get_login_info(): Promise<ApiResponse> {
    return this.makeRequest('/auth/me', {
      method: 'GET'
    });
  }
  async set_working_date(WorkingDate: string): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/auth/working-date', {
      method: 'POST',
      body: JSON.stringify({ WorkingDate: WorkingDate })
    });
  }
}


export default new ApiService();
