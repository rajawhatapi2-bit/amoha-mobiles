import apiClient from '@/lib/api-client';
import type {
  Product,
  ProductsResponse,
  ProductFilters,
  SearchSuggestion,
  ApiResponse,
} from '@/types';

export const productService = {
  getAll: async (filters?: ProductFilters): Promise<ProductsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
    }
    const { data } = await apiClient.get<ApiResponse<ProductsResponse>>(
      `/products?${params.toString()}`,
    );
    return data.data;
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const { data } = await apiClient.get<ApiResponse<Product>>(
      `/products/${slug}`,
    );
    return data.data;
  },

  getFeatured: async (): Promise<Product[]> => {
    const { data } = await apiClient.get<ApiResponse<Product[]>>(
      '/products/featured',
    );
    return data.data;
  },

  getTrending: async (): Promise<Product[]> => {
    const { data } = await apiClient.get<ApiResponse<Product[]>>(
      '/products/trending',
    );
    return data.data;
  },

  getByCategory: async (
    categorySlug: string,
    filters?: ProductFilters,
  ): Promise<ProductsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
    }
    const { data } = await apiClient.get<ApiResponse<ProductsResponse>>(
      `/products/category/${categorySlug}?${params.toString()}`,
    );
    return data.data;
  },

  search: async (query: string): Promise<SearchSuggestion[]> => {
    const { data } = await apiClient.get<ApiResponse<SearchSuggestion[]>>(
      `/products/search/suggestions?q=${encodeURIComponent(query)}`,
    );
    return data.data;
  },

  getRelated: async (productId: string): Promise<Product[]> => {
    const { data } = await apiClient.get<ApiResponse<Product[]>>(
      `/products/${productId}/related`,
    );
    return data.data;
  },

  submitReview: async (
    productId: string,
    review: { rating: number; title: string; comment: string },
  ): Promise<void> => {
    await apiClient.post(`/products/${productId}/reviews`, review);
  },

  trackView: async (productId: string): Promise<void> => {
    await apiClient.post('/products/track-view', { productId });
  },
};
