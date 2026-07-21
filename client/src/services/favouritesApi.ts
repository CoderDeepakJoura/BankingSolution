import { ApiService, ApiResponse } from './api';

export interface Favourite {
  id: number;
  path: string;
  label: string;
  category: string;
  sortOrder: number;
}

class FavouritesApiService extends ApiService {
  async getAll(): Promise<ApiResponse<Favourite[]>> {
    return this.makeRequest<Favourite[]>('/Favourites');
  }

  async add(path: string, label: string, category: string): Promise<ApiResponse<Favourite>> {
    return this.makeRequest<Favourite>('/Favourites', {
      method: 'POST',
      body: JSON.stringify({ path, label, category }),
    });
  }

  async remove(id: number): Promise<ApiResponse> {
    return this.makeRequest(`/Favourites/${id}`, { method: 'DELETE' });
  }
}

export default new FavouritesApiService();
