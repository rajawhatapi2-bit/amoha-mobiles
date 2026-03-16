import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: "user" | "admin";
  };
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type AddressType =
  | "home"
  | "work"
  | "other";

export type DiscountType =
  | "percentage"
  | "fixed";

export type UserRole =
  | "user"
  | "admin";

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  search?: string;
}

export interface ProductFilterQuery extends PaginationQuery {
  brand?: string;
  category?: string;
  priceMin?: string;
  priceMax?: string;
  ram?: string;
  storage?: string;
  battery?: string;
  rating?: string;
}