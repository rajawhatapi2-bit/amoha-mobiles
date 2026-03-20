'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineTrash, HiOutlineShoppingBag, HiOutlineTag } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cart.store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const {
    items, totalItems, subtotal, discount, deliveryCharge,
    totalAmount, coupon, isLoading,
    updateQuantity, removeFromCart, clearCart, applyCoupon, removeCoupon,
  } = useCartStore();
  const [couponCode, setCouponCode] = useState('');

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      await applyCoupon(couponCode.trim());
      toast.success('Coupon applied!');
      setCouponCode('');
    } catch {
      toast.error('Invalid coupon code');
    }
  };

  if (items.length === 0) {
    return (
      <div className="page-container flex flex-col items-center justify-center py-32 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
          <HiOutlineShoppingBag className="h-12 w-12 text-gray-600" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Your cart is empty</h2>
        <p className="mt-2 text-sm text-gray-500">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/products" className="mt-6 rounded-xl bg-primary-600 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-500 hover:shadow-glow">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Shopping Cart</h1>
          <p className="mt-1 text-sm text-gray-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { clearCart(); toast.success('Cart cleared'); }}
          className="text-sm font-medium text-red-400 transition-colors hover:text-red-300"
        >
          Clear All
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <div key={item._id} className="glass-card-sm flex gap-4 p-4">
              <Link href={`/product/${item.product.slug}`} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5 sm:h-28 sm:w-28">
                <Image src={item.product.thumbnail} alt={item.product.name} fill className="object-cover" sizes="112px" />
              </Link>
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div>
                  <Link href={`/product/${item.product.slug}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-400 line-clamp-2">
                    {item.product.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-500">{item.product.brand}{item.color ? ` Â· ${item.color}` : ''}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5">
                    <button
                      onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                    >âˆ’</button>
                    <span className="min-w-[1.5rem] text-center text-xs font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                    >+</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(item.totalPrice)}</span>
                    <button
                      onClick={() => { removeFromCart(item._id); toast.success('Removed'); }}
                      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card sticky top-24 p-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Order Summary</h3>

            {/* Coupon */}
            <div className="mt-4">
              {coupon ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <HiOutlineTag className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">{coupon.code}</span>
                  </div>
                  <button onClick={() => removeCoupon()} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="glass-input flex-1 py-2 text-xs"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="rounded-lg bg-primary-600/20 px-4 py-2 text-xs font-semibold text-primary-400 transition-colors hover:bg-primary-600/30"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2.5 border-t border-gray-200 dark:border-white/5 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Discount</span>
                  <span className="text-emerald-400">âˆ’{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Delivery</span>
                <span className={deliveryCharge === 0 ? 'text-emerald-400' : 'text-gray-900 dark:text-white'}>
                  {deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-3 text-base font-bold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="gradient-text">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-500 hover:shadow-glow"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/products"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 transition-all hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
