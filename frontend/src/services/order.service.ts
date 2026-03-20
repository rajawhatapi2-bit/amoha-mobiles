import apiClient from '@/lib/api-client';
import type { Order, OrdersResponse, Address, ApiResponse, RazorpayOrderResponse } from '@/types';

export const orderService = {
  create: async (orderData: {
    shippingAddress: Address;
    paymentMethod: string;
    couponCode?: string;
  }): Promise<Order> => {
    const { data } = await apiClient.post<ApiResponse<Order>>(
      '/orders',
      orderData,
    );
    return data.data;
  },

  createRazorpayOrder: async (couponCode?: string): Promise<RazorpayOrderResponse> => {
    const { data } = await apiClient.post<ApiResponse<RazorpayOrderResponse>>(
      '/payment/create-order',
      { couponCode },
    );
    return data.data;
  },

  verifyPayment: async (verifyData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    shippingAddress: Address;
    couponCode?: string;
  }): Promise<Order> => {
    const { data } = await apiClient.post<ApiResponse<Order>>(
      '/payment/verify',
      verifyData,
    );
    return data.data;
  },

  getAll: async (page: number = 1, limit: number = 10): Promise<OrdersResponse> => {
    const { data } = await apiClient.get<ApiResponse<OrdersResponse>>(
      `/orders?page=${page}&limit=${limit}`,
    );
    return data.data;
  },

  getById: async (orderId: string): Promise<Order> => {
    const { data } = await apiClient.get<ApiResponse<Order>>(
      `/orders/${orderId}`,
    );
    return data.data;
  },

  cancel: async (orderId: string, reason: string): Promise<Order> => {
    const { data } = await apiClient.put<ApiResponse<Order>>(
      `/orders/${orderId}/cancel`,
      { reason },
    );
    return data.data;
  },

  trackOrder: async (orderId: string): Promise<Order> => {
    const { data } = await apiClient.get<ApiResponse<Order>>(
      `/orders/${orderId}/track`,
    );
    return data.data;
  },
};
