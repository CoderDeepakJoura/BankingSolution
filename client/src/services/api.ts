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
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  private async parseErrorMessage(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type');
    try {
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        return data.message || data.Message || data.error || data.Error || 'An unexpected error occurred.';
      }
      return (await response.text()) || 'An unexpected error occurred.';
    } catch {
      return 'An unexpected error occurred.';
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    // Deduplicate concurrent refresh calls
    if (this.isRefreshing) return this.refreshPromise!;
    this.isRefreshing = true;
    this.refreshPromise = fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }).then(r => r.ok).catch(() => false).finally(() => {
      this.isRefreshing = false;
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async makeRequest<T = any>(endpoint: string, options: RequestOptions = {}, _retry = false): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestOptions = {
      headers: {
        ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Don't attempt refresh for auth endpoints themselves
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (!_retry && !isAuthEndpoint) {
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            return this.makeRequest<T>(endpoint, options, true);
          }
        }
        window.location.href = '/session-expired';
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        throw new Error(await this.parseErrorMessage(response));
      }

      if (response.status === 204) return {};

      const contentType = response.headers.get('content-type');
      const text = await response.text();

      if (contentType?.includes('application/json') && text) {
        const parsed = JSON.parse(text) as any;
        // Normalize PascalCase Success/Message from backend anonymous types
        if (parsed.Success !== undefined && parsed.success === undefined) parsed.success = parsed.Success;
        if (parsed.Message !== undefined && parsed.message === undefined) parsed.message = parsed.Message;
        return { ...(parsed as ApiResponse<T>) };
      }

      return { data: text as any };

    } catch (error) {
      if (!(error instanceof Error && error.message.includes('Session expired'))) {
        console.error('API Error:', error);
      }
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
  async set_working_date(WorkingDate: string, sessionInfo: string, sessionId: number): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest<AuthResponse>('/auth/working-date', {
      method: 'POST',
      body: JSON.stringify({ WorkingDate: WorkingDate, sessionInfo: sessionInfo, sessionId: sessionId })
    });
  }
}


export default new ApiService();
