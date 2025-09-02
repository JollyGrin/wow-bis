import axios from 'axios';
import type { Item, PaginatedResponse, ItemsSearchParams } from './items-service';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const itemsAPI = {
  search: async (params: ItemsSearchParams): Promise<PaginatedResponse<Item>> => {
    const { data } = await apiClient.get('/items', { params });
    return data;
  },

  getById: async (id: number): Promise<Item> => {
    const { data } = await apiClient.get(`/items/${id}`);
    return data;
  },

  getBatch: async (itemIds: number[]): Promise<Item[]> => {
    const { data } = await apiClient.post('/items/batch', { itemIds });
    return data.items;
  },

  getMetadata: async () => {
    const { data } = await apiClient.get('/items/metadata');
    return data;
  },
};