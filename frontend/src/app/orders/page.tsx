'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineChevronRight } from 'react-icons/hi';
import type { Order } from '@/types';
import { orderService } from '@/services/order.service';
import { useAuthStore } from '@/store/auth.store';
import { formatPrice, formatDate } from '@/lib/utils';
import { OrderCardSkeleton } from '@/components/ui/Skeletons';
import Pagination from '@/components/ui/Pagination';

const statusColors: Record<string, string> = {
  placed: 'bg-blue-500/20 text-blue-400',
  confirmed: 'bg-indigo-500/20 text-indigo-400',
  processing: 'bg-amber-500/20 text-amber-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  out_for_delivery: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400',
  returned: 'bg-gray-500/20 text-gray-500 dark:text-gray-400',
};

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const data = await orderService.getAll(currentPage);
        setOrders(data.orders);
        setTotalPages(data.totalPages);
      } catch {
        // handle error
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [isAuthenticated, currentPage]);

  if (!isAuthenticated) {
    return (
      <div className="page-container flex flex-col items-center justify-center py-32 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5 mx-auto">
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Login Required</h2>
        <p className="mt-2 text-sm text-gray-500">Please sign in to view your orders.</p>
        <Link href="/login" className="mt-6 rounded-xl bg-primary-600 px-8 py-3 text-sm font-semibold text-white hover:bg-primary-500">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="page-container py-6 sm:py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        </div>
      ) : orders.length > 0 ? (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="glass-card overflow-hidden">
                {/* Order Header */}
                <button
                  onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                  className="flex w-full items-center justify-between p-4 text-left sm:p-5"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Order #{order.orderNumber}</p>
                      <p className="text-xs text-gray-600">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusColors[order.orderStatus] || 'bg-gray-500/20 text-gray-500 dark:text-gray-400'}`}>
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(order.totalAmount)}</span>
                    <HiOutlineChevronRight className={`h-4 w-4 text-gray-500 transition-transform ${expandedOrder === order._id ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Order Items (expanded) */}
                {expandedOrder === order._id && (
                  <div className="border-t border-gray-200 dark:border-white/5 p-4 sm:p-5 animate-slide-down">
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-3">
                          <Link href={`/product/${item.product.slug}`} className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
                            <Image src={item.product.thumbnail} alt={item.product.name} fill className="object-cover" sizes="64px" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link href={`/product/${item.product.slug}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-400 line-clamp-1">
                              {item.product.name}
                            </Link>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}{item.color ? ` · ${item.color}` : ''}</p>
                            <p className="text-sm font-semibold text-primary-400">{formatPrice(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Details */}
                    <div className="mt-4 grid gap-4 border-t border-gray-200 dark:border-white/5 pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Shipping Address</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {order.shippingAddress.fullName}<br />
                          {order.shippingAddress.addressLine1}<br />
                          {order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Payment</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 capitalize">{order.paymentMethod}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {order.paymentStatus}
                        </span>
                        {order.estimatedDelivery && (
                          <p className="mt-2 text-xs text-gray-500">
                            Est. Delivery: {formatDate(order.estimatedDelivery)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tracking Info */}
                    {order.trackingNumber && (
                      <div className="mt-4 border-t border-gray-200 dark:border-white/5 pt-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">Tracking Information</p>
                        <div className="rounded-lg bg-gray-100 dark:bg-white/5 p-3 space-y-1.5">
                          {order.logisticsPartner && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Courier</span>
                              <span className="text-gray-600 dark:text-gray-300 capitalize">{order.logisticsPartner.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Tracking No.</span>
                            <span className="font-mono text-gray-600 dark:text-gray-300">{order.trackingNumber}</span>
                          </div>
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 mt-1"
                            >
                              Track your order →
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status History */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                      <div className="mt-4 border-t border-gray-200 dark:border-white/5 pt-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">Status Timeline</p>
                        <div className="space-y-2">
                          {order.statusHistory.map((status, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className={`mt-1 h-2 w-2 rounded-full ${idx === 0 ? 'bg-primary-500' : 'bg-gray-600'}`} />
                              <div>
                                <p className="text-xs font-medium capitalize text-gray-600 dark:text-gray-300">{status.status.replace(/_/g, ' ')}</p>
                                <p className="text-[10px] text-gray-600">{formatDate(status.date)} · {status.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="mt-4 rounded-lg bg-gray-100 dark:bg-white/5 p-3 space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Subtotal</span><span className="text-gray-600 dark:text-gray-300">{formatPrice(order.subtotal)}</span></div>
                      {order.discount > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Discount</span><span className="text-emerald-400">−{formatPrice(order.discount)}</span></div>}
                      <div className="flex justify-between text-xs"><span className="text-gray-500">Delivery</span><span className="text-gray-600 dark:text-gray-300">{order.deliveryCharge === 0 ? 'FREE' : formatPrice(order.deliveryCharge)}</span></div>
                      <div className="flex justify-between border-t border-gray-200 dark:border-white/5 pt-1 text-sm font-bold"><span className="text-gray-900 dark:text-white">Total</span><span className="gradient-text">{formatPrice(order.totalAmount)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5 mx-auto">
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No orders yet</h3>
          <p className="mt-1 text-sm text-gray-500">Your order history will appear here.</p>
          <Link href="/products" className="mt-6 rounded-xl bg-primary-600 px-8 py-3 text-sm font-semibold text-white hover:bg-primary-500">
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
}
